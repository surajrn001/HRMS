from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import Leave, Employee, User, UserRole, LeaveStatus, Notification
from schemas import LeaveCreate, LeaveStatusUpdate, LeaveOut
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/leaves", tags=["Leave Management"])

@router.get("", response_model=List[LeaveOut])
def get_leaves(
    status_filter: Optional[LeaveStatus] = Query(None, alias="status"),
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Leave).join(Employee)

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(Leave.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(Leave.employee_id == employee_id)

    if status_filter:
        query = query.filter(Leave.status == status_filter)

    leaves = query.order_by(Leave.created_at.desc()).all()

    result = []
    for l in leaves:
        result.append(LeaveOut(
            id=l.id,
            employee_id=l.employee_id,
            employee_name=l.employee.full_name if l.employee else None,
            department=l.employee.department if l.employee else None,
            leave_type=l.leave_type,
            start_date=l.start_date,
            end_date=l.end_date,
            reason=l.reason,
            status=l.status,
            created_at=l.created_at
        ))
    return result

@router.post("", response_model=LeaveOut, status_code=status.HTTP_201_CREATED)
def apply_leave(
    leave_in: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp_id = leave_in.employee_id
    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            raise HTTPException(status_code=400, detail="User has no linked employee profile")
        emp_id = current_user.employee.id
    elif not emp_id:
        if current_user.employee:
            emp_id = current_user.employee.id
        else:
            raise HTTPException(status_code=400, detail="Employee ID must be specified")

    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if leave_in.end_date < leave_in.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be earlier than start date")

    new_leave = Leave(
        employee_id=emp_id,
        leave_type=leave_in.leave_type,
        start_date=leave_in.start_date,
        end_date=leave_in.end_date,
        reason=leave_in.reason,
        status=LeaveStatus.PENDING,
        created_at=datetime.utcnow()
    )
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)

    # Notify HR and Admins
    hr_users = db.query(User).filter(User.role.in_([UserRole.HR, UserRole.ADMIN])).all()
    for hr_u in hr_users:
        notif = Notification(
            user_id=hr_u.id,
            title=f"New Leave Request: {emp.full_name}",
            message=f"{emp.full_name} applied for {new_leave.leave_type.value} leave from {new_leave.start_date} to {new_leave.end_date}."
        )
        db.add(notif)
    db.commit()

    return LeaveOut(
        id=new_leave.id,
        employee_id=new_leave.employee_id,
        employee_name=emp.full_name,
        department=emp.department,
        leave_type=new_leave.leave_type,
        start_date=new_leave.start_date,
        end_date=new_leave.end_date,
        reason=new_leave.reason,
        status=new_leave.status,
        created_at=new_leave.created_at
    )

@router.put("/{leave_id}/status", response_model=LeaveOut)
def update_leave_status(
    leave_id: int,
    status_update: LeaveStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.HR]))
):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = status_update.status
    db.commit()
    db.refresh(leave)

    # Trigger notification to the employee's user
    if leave.employee and leave.employee.user:
        status_text = "APPROVED" if leave.status == LeaveStatus.APPROVED else "REJECTED"
        notif = Notification(
            user_id=leave.employee.user.id,
            title=f"Leave Request {status_text}",
            message=f"Your {leave.leave_type.value} leave application ({leave.start_date} to {leave.end_date}) was {status_text.lower()} by {current_user.username}."
        )
        db.add(notif)
        db.commit()

    return LeaveOut(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=leave.employee.full_name if leave.employee else None,
        department=leave.employee.department if leave.employee else None,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason,
        status=leave.status,
        created_at=leave.created_at
    )
