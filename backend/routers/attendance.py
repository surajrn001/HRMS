from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional

from database import get_db
from models import Attendance, Employee, User, UserRole, AttendanceStatus, EmployeeStatus, Notification, EmployeeShift, Shift
from schemas import AttendanceOut, AttendanceManualCreate
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/attendance", tags=["Attendance Management"])

STANDARD_SHIFT_START_HOUR = 9
STANDARD_SHIFT_START_MINUTE = 30
STANDARD_SHIFT_HOURS = 8.0

def calculate_hours_and_status(check_in: Optional[datetime], check_out: Optional[datetime]):
    if not check_in or not check_out:
        return 0.0, AttendanceStatus.PRESENT, 0.0
    diff = check_out - check_in
    hours = round(max(0.0, diff.total_seconds() / 3600.0), 2)
    att_status = (
        AttendanceStatus.PRESENT if hours >= 7.5 else
        AttendanceStatus.HALF_DAY if hours >= 4.0 else
        AttendanceStatus.ABSENT
    )
    overtime = round(max(0.0, hours - STANDARD_SHIFT_HOURS), 2)
    return hours, att_status, overtime

def check_shift_late_entry(db: Session, employee_id: int, check_in_time: datetime):
    assignment = db.query(EmployeeShift).filter(
        EmployeeShift.employee_id == employee_id,
        EmployeeShift.is_active == True
    ).first()

    shift_title = "Standard (09:30 AM)"
    if assignment and assignment.shift and assignment.shift.start_time:
        try:
            parts = assignment.shift.start_time.split(":")
            sh_h, sh_m = int(parts[0]), int(parts[1])
            shift_start_min = sh_h * 60 + sh_m
            cutoff_min = shift_start_min + 15
            current_min = check_in_time.hour * 60 + check_in_time.minute
            shift_title = f"{assignment.shift.name} ({assignment.shift.start_time})"
            if current_min > cutoff_min:
                return True, current_min - shift_start_min, shift_title
            return False, 0, shift_title
        except Exception:
            pass

    total_minutes = check_in_time.hour * 60 + check_in_time.minute
    shift_start = STANDARD_SHIFT_START_HOUR * 60 + STANDARD_SHIFT_START_MINUTE
    if total_minutes > shift_start:
        return True, total_minutes - shift_start, shift_title
    return False, 0, shift_title

def _to_attendance_out(r: Attendance, emp: Optional[Employee] = None) -> AttendanceOut:
    employee = emp or r.employee
    return AttendanceOut(
        id=r.id,
        employee_id=r.employee_id,
        employee_name=employee.full_name if employee else None,
        department=employee.department if employee else None,
        date=r.date,
        check_in=r.check_in,
        check_out=r.check_out,
        working_hours=r.working_hours,
        status=r.status,
        is_late=r.is_late,
        late_minutes=r.late_minutes,
        overtime_hours=r.overtime_hours,
    )

@router.get("/today", response_model=Optional[AttendanceOut])
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.employee:
        return None

    record = db.query(Attendance).filter(
        Attendance.employee_id == current_user.employee.id,
        Attendance.date == date.today()
    ).first()

    return _to_attendance_out(record, current_user.employee) if record else None

@router.post("/check-in", response_model=AttendanceOut)
def check_in(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.employee:
        raise HTTPException(status_code=400, detail="Current user is not linked to an employee profile")

    today = date.today()
    now = datetime.now()

    record = db.query(Attendance).filter(
        Attendance.employee_id == current_user.employee.id,
        Attendance.date == today
    ).first()

    if record:
        if record.check_out:
            raise HTTPException(
                status_code=400,
                detail=f"Shift already completed today at {record.check_out.strftime('%I:%M %p')}."
            )
        if record.check_in:
            raise HTTPException(
                status_code=400,
                detail=f"Already checked in today at {record.check_in.strftime('%I:%M %p')}."
            )

    is_late, late_min, shift_title = check_shift_late_entry(db, current_user.employee.id, now)

    if record:
        record.check_in = now
        record.status = AttendanceStatus.PRESENT
        record.is_late = is_late
        record.late_minutes = late_min
    else:
        record = Attendance(
            employee_id=current_user.employee.id,
            date=today,
            check_in=now,
            status=AttendanceStatus.PRESENT,
            working_hours=0.0,
            is_late=is_late,
            late_minutes=late_min,
            overtime_hours=0.0
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    if is_late:
        db.add(Notification(
            user_id=current_user.id,
            title="Late Entry Recorded",
            message=f"Punched in at {now.strftime('%I:%M %p')} ({late_min}m after {shift_title} shift start).",
            category="ATTENDANCE"
        ))
        db.commit()

    return _to_attendance_out(record, current_user.employee)

@router.post("/check-out", response_model=AttendanceOut)
def check_out(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.employee:
        raise HTTPException(status_code=400, detail="Current user is not linked to an employee profile")

    record = db.query(Attendance).filter(
        Attendance.employee_id == current_user.employee.id,
        Attendance.date == date.today()
    ).first()

    if not record or not record.check_in:
        raise HTTPException(status_code=400, detail="You must punch in first before checking out.")

    if record.check_out:
        raise HTTPException(status_code=400, detail=f"Already checked out today at {record.check_out.strftime('%I:%M %p')}.")

    now = datetime.now()
    record.check_out = now
    hours, att_status, overtime = calculate_hours_and_status(record.check_in, record.check_out)
    record.working_hours = hours
    record.status = att_status
    record.overtime_hours = overtime

    db.commit()
    db.refresh(record)

    if overtime > 0:
        db.add(Notification(
            user_id=current_user.id,
            title="Overtime Clocked",
            message=f"Completed {hours} hours today with {overtime} hours overtime.",
            category="ATTENDANCE"
        ))
        db.commit()

    return _to_attendance_out(record, current_user.employee)

@router.get("/history", response_model=List[AttendanceOut])
def get_attendance_history(
    employee_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    only_late: Optional[bool] = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Attendance).join(Employee)

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(Attendance.employee_id == current_user.employee.id)
    elif employee_id:
        query = query.filter(Attendance.employee_id == employee_id)

    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)
    if only_late:
        query = query.filter(Attendance.is_late == True)

    records = query.order_by(Attendance.date.desc(), Attendance.id.desc()).limit(200).all()
    return [_to_attendance_out(r) for r in records]

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

    hours, calculated_status, overtime = calculate_hours_and_status(item.check_in, item.check_out)
    final_status = item.status or calculated_status

    is_late = item.is_late
    late_minutes = item.late_minutes
    if item.check_in and is_late is False and late_minutes == 0:
        is_late, late_minutes = check_late_entry(item.check_in)

    if existing:
        existing.check_in = item.check_in
        existing.check_out = item.check_out
        existing.working_hours = hours
        existing.status = final_status
        existing.is_late = is_late
        existing.late_minutes = late_minutes
        existing.overtime_hours = overtime
        record = existing
    else:
        record = Attendance(
            employee_id=item.employee_id,
            date=item.date,
            check_in=item.check_in,
            check_out=item.check_out,
            working_hours=hours,
            status=final_status,
            is_late=is_late,
            late_minutes=late_minutes,
            overtime_hours=overtime
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return _to_attendance_out(record, emp)

@router.post("/auto-mark-absent")
def auto_mark_absent(
    target_date: Optional[date] = Query(None, description="Date to evaluate (defaults to today)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.HR]))
):
    eval_date = target_date or date.today()
    if eval_date.weekday() >= 5:
        return {"marked_absent_count": 0, "message": "Weekend dates are non-working days; no absences marked."}

    active_employees = db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE).all()
    marked_count = 0

    for emp in active_employees:
        existing = db.query(Attendance).filter(
            Attendance.employee_id == emp.id,
            Attendance.date == eval_date
        ).first()

        if not existing:
            db.add(Attendance(
                employee_id=emp.id,
                date=eval_date,
                check_in=None,
                check_out=None,
                working_hours=0.0,
                status=AttendanceStatus.ABSENT,
                is_late=False,
                late_minutes=0,
                overtime_hours=0.0
            ))
            marked_count += 1

    db.commit()
    return {
        "marked_absent_count": marked_count,
        "date": eval_date.isoformat(),
        "message": f"Successfully marked {marked_count} employee(s) absent for {eval_date.isoformat()}."
    }
