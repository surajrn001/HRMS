from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from datetime import date
from database import get_db
from models import (
    Employee, User, UserRole, EmployeeStatus, Notification,
    EmployeeShift, Shift, Attendance, AttendanceStatus, Performance
)
from schemas import EmployeeCreate, EmployeeUpdate, EmployeeOut
from auth import get_current_user, require_roles, get_password_hash

router = APIRouter(prefix="/api/employees", tags=["Employee Management"])

def _build_employee_out(emp: Employee, db: Session) -> EmployeeOut:
    # Active shift
    active_shift_rec = next((es for es in emp.employee_shifts if es.is_active), None)
    shift_name = active_shift_rec.shift.name if active_shift_rec and active_shift_rec.shift else None
    shift_id = active_shift_rec.shift_id if active_shift_rec else None
    shift_timings = f"{active_shift_rec.shift.start_time} - {active_shift_rec.shift.end_time}" if active_shift_rec and active_shift_rec.shift else None

    # Performance
    ratings = [p.rating for p in emp.performances]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

    # Attendance today
    today = date.today()
    today_att = next((a for a in emp.attendances if a.date == today), None)
    att_status = None
    if today_att:
        if today_att.is_late:
            att_status = "LATE"
        else:
            att_status = today_att.status.value
    else:
        att_status = "NOT_MARKED"

    return EmployeeOut(
        id=emp.id,
        user_id=emp.user_id,
        full_name=emp.full_name,
        designation=emp.designation,
        department=emp.department,
        joining_date=emp.joining_date,
        salary=emp.salary,
        status=emp.status,
        user_email=emp.user.email if emp.user else None,
        user_role=emp.user.role.value if emp.user else None,
        current_shift=shift_name,
        shift_id=shift_id,
        shift_timings=shift_timings,
        avg_rating=avg_rating,
        attendance_today=att_status
    )

@router.get("", response_model=List[EmployeeOut])
def list_employees(
    search: Optional[str] = Query(None, description="Search by name, designation, or department"),
    department: Optional[str] = Query(None, description="Filter by department"),
    role: Optional[str] = Query(None, description="Filter by user role (ADMIN/HR/EMPLOYEE)"),
    status: Optional[EmployeeStatus] = Query(None, description="Filter by status"),
    shift_id: Optional[int] = Query(None, description="Filter by assigned shift ID"),
    attendance_today: Optional[str] = Query(None, description="Filter by today's attendance (PRESENT/LATE/ABSENT/NOT_MARKED)"),
    min_rating: Optional[float] = Query(None, description="Filter by minimum average performance rating"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.HR]))
):
    query = db.query(Employee).outerjoin(User)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Employee.full_name.ilike(search_term)) |
            (Employee.designation.ilike(search_term)) |
            (Employee.department.ilike(search_term)) |
            (User.email.ilike(search_term))
        )

    if department:
        query = query.filter(Employee.department == department)

    if status:
        query = query.filter(Employee.status == status)

    if role:
        query = query.filter(User.role == UserRole(role.upper()))

    if shift_id:
        query = query.join(EmployeeShift).filter(
            EmployeeShift.shift_id == shift_id,
            EmployeeShift.is_active == True
        )

    employees = query.order_by(Employee.id.desc()).all()

    # In-memory post-filters for attendance_today and min_rating
    result = []
    for emp in employees:
        emp_out = _build_employee_out(emp, db)

        if attendance_today and emp_out.attendance_today != attendance_today:
            continue

        if min_rating is not None:
            if emp_out.avg_rating is None or emp_out.avg_rating < min_rating:
                continue

        result.append(emp_out)

    return result

@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if current_user.role == UserRole.EMPLOYEE and (not current_user.employee or current_user.employee.id != employee_id):
        raise HTTPException(status_code=403, detail="Not authorized to view other employee records")

    return _build_employee_out(emp, db)

@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    emp_in: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.HR]))
):
    # Check if user already exists with email
    existing_user = db.query(User).filter(User.email == emp_in.email).first()
    if existing_user:
        if existing_user.employee:
            raise HTTPException(
                status_code=400,
                detail="An employee profile already exists for this email"
            )
        target_user = existing_user
    else:
        # Create user account
        username = emp_in.username or emp_in.email.split("@")[0]
        # Check username collision
        idx = 1
        base_username = username
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{idx}"
            idx += 1

        hashed_pw = get_password_hash(emp_in.password or "password123")
        target_user = User(
            username=username,
            email=emp_in.email,
            hashed_password=hashed_pw,
            role=emp_in.role
        )
        db.add(target_user)
        db.commit()
        db.refresh(target_user)

    new_emp = Employee(
        user_id=target_user.id,
        full_name=emp_in.full_name,
        designation=emp_in.designation,
        department=emp_in.department,
        joining_date=emp_in.joining_date,
        salary=emp_in.salary,
        status=emp_in.status
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)

    # Initialize leave balances for the new employee
    from routers.leaves import ensure_employee_balances
    ensure_employee_balances(new_emp.id, db)

    # Notification for newly added employee
    notif = Notification(
        user_id=target_user.id,
        title="Employee Profile Created",
        message=f"Welcome {new_emp.full_name}! Your profile as {new_emp.designation} in {new_emp.department} is now active."
    )
    db.add(notif)
    db.commit()

    return EmployeeOut(
        id=new_emp.id,
        user_id=target_user.id,
        full_name=new_emp.full_name,
        designation=new_emp.designation,
        department=new_emp.department,
        joining_date=new_emp.joining_date,
        salary=new_emp.salary,
        status=new_emp.status,
        user_email=target_user.email,
        user_role=target_user.role.value
    )

@router.put("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int,
    emp_update: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.HR]))
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = emp_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(emp, field, value)

    db.commit()
    db.refresh(emp)

    return EmployeeOut(
        id=emp.id,
        user_id=emp.user_id,
        full_name=emp.full_name,
        designation=emp.designation,
        department=emp.department,
        joining_date=emp.joining_date,
        salary=emp.salary,
        status=emp.status,
        user_email=emp.user.email if emp.user else None,
        user_role=emp.user.role.value if emp.user else None
    )

@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    db.delete(emp)
    db.commit()
    return None
