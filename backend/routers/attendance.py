from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, date, time
from typing import List, Optional

from database import get_db
from models import Attendance, Employee, User, UserRole, AttendanceStatus, Notification
from schemas import AttendanceOut, AttendanceManualCreate
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/attendance", tags=["Attendance Management"])

def calculate_hours_and_status(check_in: Optional[datetime], check_out: Optional[datetime]):
    if not check_in or not check_out:
        return 0.0, AttendanceStatus.PRESENT
    diff = check_out - check_in
    hours = round(max(0.0, diff.total_seconds() / 3600.0), 2)
    if hours >= 7.5:
        att_status = AttendanceStatus.PRESENT
    elif hours >= 4.0:
        att_status = AttendanceStatus.HALF_DAY
    else:
        att_status = AttendanceStatus.ABSENT
    return hours, att_status

@router.get("/today", response_model=Optional[AttendanceOut])
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.employee:
        return None

    today = date.today()
    record = db.query(Attendance).filter(
        Attendance.employee_id == current_user.employee.id,
        Attendance.date == today
    ).first()

    if not record:
        return None

    return AttendanceOut(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=current_user.employee.full_name,
        department=current_user.employee.department,
        date=record.date,
        check_in=record.check_in,
        check_out=record.check_out,
        working_hours=record.working_hours,
        status=record.status
    )

@router.post("/check-in", response_model=AttendanceOut)
def check_in(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.employee:
        raise HTTPException(
            status_code=400,
            detail="Current user is not linked to an employee profile"
        )

    today = date.today()
    now = datetime.utcnow()

    # Check if already checked in today
    record = db.query(Attendance).filter(
        Attendance.employee_id == current_user.employee.id,
        Attendance.date == today
    ).first()

    if record:
        if record.check_in:
            raise HTTPException(
                status_code=400,
                detail=f"Already checked in today at {record.check_in.strftime('%H:%M:%S UTC')}"
            )
        record.check_in = now
        record.status = AttendanceStatus.PRESENT
    else:
        record = Attendance(
            employee_id=current_user.employee.id,
            date=today,
            check_in=now,
            status=AttendanceStatus.PRESENT,
            working_hours=0.0
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return AttendanceOut(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=current_user.employee.full_name,
        department=current_user.employee.department,
        date=record.date,
        check_in=record.check_in,
        check_out=record.check_out,
        working_hours=record.working_hours,
        status=record.status
    )

@router.post("/check-out", response_model=AttendanceOut)
def check_out(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.employee:
        raise HTTPException(
            status_code=400,
            detail="Current user is not linked to an employee profile"
        )

    today = date.today()
    now = datetime.utcnow()

    record = db.query(Attendance).filter(
        Attendance.employee_id == current_user.employee.id,
        Attendance.date == today
    ).first()

    if not record or not record.check_in:
        raise HTTPException(
            status_code=400,
            detail="You must check-in first before checking out"
        )

    if record.check_out:
        raise HTTPException(
            status_code=400,
            detail=f"Already checked out today at {record.check_out.strftime('%H:%M:%S UTC')}"
        )

    record.check_out = now
    hours, att_status = calculate_hours_and_status(record.check_in, record.check_out)
    record.working_hours = hours
    record.status = att_status

    db.commit()
    db.refresh(record)

    return AttendanceOut(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=current_user.employee.full_name,
        department=current_user.employee.department,
        date=record.date,
        check_in=record.check_in,
        check_out=record.check_out,
        working_hours=record.working_hours,
        status=record.status
    )

@router.get("/history", response_model=List[AttendanceOut])
def get_attendance_history(
    employee_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Attendance).join(Employee)

    # If employee, only allow viewing own history unless HR/ADMIN
    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(Attendance.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(Attendance.employee_id == employee_id)

    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    records = query.order_by(Attendance.date.desc(), Attendance.id.desc()).limit(150).all()

    result = []
    for r in records:
        result.append(AttendanceOut(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=r.employee.full_name if r.employee else None,
            department=r.employee.department if r.employee else None,
            date=r.date,
            check_in=r.check_in,
            check_out=r.check_out,
            working_hours=r.working_hours,
            status=r.status
        ))
    return result

@router.post("/manual", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def manual_attendance_record(
    item: AttendanceManualCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.HR]))
):
    emp = db.query(Employee).filter(Employee.id == item.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    existing = db.query(Attendance).filter(
        Attendance.employee_id == item.employee_id,
        Attendance.date == item.date
    ).first()

    hours, calculated_status = calculate_hours_and_status(item.check_in, item.check_out)
    final_status = item.status or calculated_status

    if existing:
        existing.check_in = item.check_in
        existing.check_out = item.check_out
        existing.working_hours = hours
        existing.status = final_status
        record = existing
    else:
        record = Attendance(
            employee_id=item.employee_id,
            date=item.date,
            check_in=item.check_in,
            check_out=item.check_out,
            working_hours=hours,
            status=final_status
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return AttendanceOut(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=emp.full_name,
        department=emp.department,
        date=record.date,
        check_in=record.check_in,
        check_out=record.check_out,
        working_hours=record.working_hours,
        status=record.status
    )
