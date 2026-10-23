from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Dict, Any

from database import get_db
from models import (
    Employee, Attendance, Leave, Payroll, User, UserRole,
    EmployeeStatus, AttendanceStatus, LeaveStatus, LeaveBalance
)
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard & Analytics"])

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = date.today()

    # Employee counts
    total_employees = db.query(Employee).count()
    active_employees = db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE).count()

    # Today's attendance
    today_records = db.query(Attendance).filter(Attendance.date == today).all()
    present_today = sum(1 for r in today_records if r.status == AttendanceStatus.PRESENT)
    half_day_today = sum(1 for r in today_records if r.status == AttendanceStatus.HALF_DAY)
    absent_today = max(0, active_employees - (present_today + half_day_today))
    late_today = sum(1 for r in today_records if r.is_late)
    overtime_count = sum(1 for r in today_records if r.overtime_hours > 0)

    # Leaves stats
    pending_leaves = db.query(Leave).filter(Leave.status == LeaveStatus.PENDING).count()
    approved_leaves = db.query(Leave).filter(Leave.status == LeaveStatus.APPROVED).count()
    rejected_leaves = db.query(Leave).filter(Leave.status == LeaveStatus.REJECTED).count()

    # Payroll overview
    current_month_str = today.strftime("%B %Y")
    payroll_records = db.query(Payroll).filter(Payroll.month == current_month_str).all()
    if not payroll_records:
        payroll_records = db.query(Payroll).order_by(Payroll.id.desc()).limit(20).all()

    total_payroll_exp = sum(p.net_salary for p in payroll_records)
    total_bonuses = sum(p.bonus for p in payroll_records)
    total_deductions = sum(p.deductions for p in payroll_records)

    # Department distribution
    dept_counts = (
        db.query(Employee.department, func.count(Employee.id))
        .group_by(Employee.department)
        .all()
    )
    department_distribution = [{"department": dept, "count": cnt} for dept, cnt in dept_counts]

    # Recent attendances
    recent_att_query = db.query(Attendance).join(Employee).order_by(Attendance.date.desc(), Attendance.id.desc())
    if current_user.role == UserRole.EMPLOYEE and current_user.employee:
        recent_att_query = recent_att_query.filter(Attendance.employee_id == current_user.employee.id)
    recent_attendances = recent_att_query.limit(8).all()

    # Recent leaves
    recent_leaves_query = db.query(Leave).join(Employee).order_by(Leave.created_at.desc())
    if current_user.role == UserRole.EMPLOYEE and current_user.employee:
        recent_leaves_query = recent_leaves_query.filter(Leave.employee_id == current_user.employee.id)
    recent_leaves = recent_leaves_query.limit(8).all()

    # Employee-specific personal stats for Self-Service Portal
    personal_stats = {}
    if current_user.employee:
        emp_id = current_user.employee.id
        my_attendances_this_month = db.query(Attendance).filter(
            Attendance.employee_id == emp_id,
            Attendance.date >= today.replace(day=1)
        ).all()
        my_leaves_count = db.query(Leave).filter(Leave.employee_id == emp_id).count()
        latest_payroll = db.query(Payroll).filter(Payroll.employee_id == emp_id).order_by(Payroll.id.desc()).first()

        # Today's punch status for ESS
        today_punch = db.query(Attendance).filter(
            Attendance.employee_id == emp_id,
            Attendance.date == today
        ).first()

        # Leave balances for ESS
        balances = db.query(LeaveBalance).filter(LeaveBalance.employee_id == emp_id).all()
        balance_data = [
            {
                "leave_type": b.leave_type.value,
                "total_days": b.total_days,
                "used_days": b.used_days,
                "remaining_days": b.remaining_days
            }
            for b in balances
        ]

        personal_stats = {
            "my_present_days": sum(1 for a in my_attendances_this_month if a.status in [AttendanceStatus.PRESENT, AttendanceStatus.HALF_DAY]),
            "my_late_days": sum(1 for a in my_attendances_this_month if a.is_late),
            "my_overtime_hours": round(sum(a.overtime_hours for a in my_attendances_this_month), 2),
            "my_total_leaves": my_leaves_count,
            "my_latest_salary": latest_payroll.net_salary if latest_payroll else current_user.employee.salary,
            "my_department": current_user.employee.department,
            "my_designation": current_user.employee.designation,
            "my_joining_date": str(current_user.employee.joining_date),
            "today_punch": {
                "checked_in": bool(today_punch and today_punch.check_in),
                "checked_out": bool(today_punch and today_punch.check_out),
                "check_in_time": today_punch.check_in.isoformat() if (today_punch and today_punch.check_in) else None,
                "check_out_time": today_punch.check_out.isoformat() if (today_punch and today_punch.check_out) else None,
                "is_late": today_punch.is_late if today_punch else False,
                "late_minutes": today_punch.late_minutes if today_punch else 0,
                "working_hours": today_punch.working_hours if today_punch else 0.0
            },
            "leave_balances": balance_data
        }

    return {
        "user_role": current_user.role.value,
        "total_employees": total_employees,
        "active_employees": active_employees,
        "attendance_summary": {
            "present_today": present_today,
            "absent_today": absent_today,
            "half_day_today": half_day_today,
            "late_today": late_today,
            "overtime_today": overtime_count,
            "total_today": present_today + half_day_today + absent_today
        },
        "leave_stats": {
            "pending": pending_leaves,
            "approved": approved_leaves,
            "rejected": rejected_leaves,
            "total": pending_leaves + approved_leaves + rejected_leaves
        },
        "payroll_overview": {
            "month": current_month_str,
            "total_monthly_payroll": round(total_payroll_exp, 2),
            "total_bonuses": round(total_bonuses, 2),
            "total_deductions": round(total_deductions, 2),
            "records_count": len(payroll_records)
        },
        "department_distribution": department_distribution,
        "personal_stats": personal_stats,
        "recent_attendances": [
            {
                "id": a.id,
                "employee_name": a.employee.full_name if a.employee else "",
                "department": a.employee.department if a.employee else "",
                "date": str(a.date),
                "check_in": a.check_in.isoformat() if a.check_in else None,
                "check_out": a.check_out.isoformat() if a.check_out else None,
                "working_hours": a.working_hours,
                "status": a.status.value,
                "is_late": a.is_late,
                "late_minutes": a.late_minutes,
                "overtime_hours": a.overtime_hours
            }
            for a in recent_attendances
        ],
        "recent_leaves": [
            {
                "id": l.id,
                "employee_name": l.employee.full_name if l.employee else "",
                "department": l.employee.department if l.employee else "",
                "leave_type": l.leave_type.value,
                "start_date": str(l.start_date),
                "end_date": str(l.end_date),
                "reason": l.reason,
                "status": l.status.value,
                "created_at": l.created_at.isoformat()
            }
            for l in recent_leaves
        ]
    }
