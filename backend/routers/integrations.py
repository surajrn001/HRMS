import io
import csv
import urllib.parse
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/integrations", tags=["Third-Party Integrations"])

# In-memory recent email logs for audit and visibility in the UI
EMAIL_AUDIT_LOGS = []

@router.post("/email/test", response_model=schemas.EmailTestResponse)
def send_test_email(
    payload: schemas.EmailTestRequest,
    current_user: models.User = Depends(get_current_user)
):
    """
    Sends an automated test email notification.
    Configured with simulated local delivery engine with delivery timestamp logging.
    """
    now = datetime.utcnow()
    log_entry = {
        "id": len(EMAIL_AUDIT_LOGS) + 1,
        "recipient": payload.recipient,
        "subject": payload.subject,
        "body": payload.body,
        "sent_by": current_user.username,
        "timestamp": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "status": "DELIVERED"
    }
    EMAIL_AUDIT_LOGS.insert(0, log_entry)
    if len(EMAIL_AUDIT_LOGS) > 50:
        EMAIL_AUDIT_LOGS.pop()

    return schemas.EmailTestResponse(
        status="DELIVERED",
        recipient=payload.recipient,
        subject=payload.subject,
        delivered_at=now,
        simulated=True,
        message="Email successfully dispatched through WorkSphere Integration Service."
    )

@router.get("/email/logs")
def get_email_logs(
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    return EMAIL_AUDIT_LOGS

@router.get("/calendar/google-link")
def get_google_calendar_event_link(
    title: str = Query("WorkSphere Work Shift", description="Event Title"),
    start_time: str = Query("09:00", description="HH:MM start"),
    end_time: str = Query("18:00", description="HH:MM end"),
    event_date: Optional[str] = None
):
    """
    Generates a 1-click Google Calendar web event URL.
    """
    d = event_date or date.today().isoformat()
    dt_str = d.replace("-", "")
    st_clean = start_time.replace(":", "") + "00"
    et_clean = end_time.replace(":", "") + "00"

    dates_param = f"{dt_str}T{st_clean}/{dt_str}T{et_clean}"
    details = urllib.parse.quote("WorkSphere Automated HRMS Scheduled Event")
    location = urllib.parse.quote("WorkSphere Tech Pvt. Ltd. Bengaluru HQ")
    title_encoded = urllib.parse.quote(title)

    google_url = f"https://calendar.google.com/calendar/render?action=TEMPLATE&text={title_encoded}&dates={dates_param}&details={details}&location={location}"
    return {"google_calendar_url": google_url}

@router.get("/calendar/ics")
def download_icalendar_feed(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Generates an RFC 5545 standard .ics file for calendar clients
    (Google Calendar, Apple Calendar, Microsoft Outlook).
    Includes user shift assignments and approved leaves.
    """
    emp = current_user.employee
    emp_name = emp.full_name if emp else current_user.username

    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//WorkSphere HRMS//Calendar Integration//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:WorkSphere - {emp_name}",
        "X-WR-TIMEZONE:Asia/Kolkata",
    ]

    now_str = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    # Add Shifts
    if emp and emp.employee_shifts:
        for es in emp.employee_shifts:
            shift = es.shift
            if not shift:
                continue
            # Next 14 business days shift events
            today = date.today()
            for offset in range(14):
                day = today + timedelta(days=offset)
                if day.weekday() >= 5:  # Skip weekends
                    continue
                day_str = day.strftime("%Y%m%d")
                st = shift.start_time.replace(":", "") + "00"
                et = shift.end_time.replace(":", "") + "00"

                ics_lines.extend([
                    "BEGIN:VEVENT",
                    f"UID:shift-{es.id}-{day_str}@worksphere.co.in",
                    f"DTSTAMP:{now_str}",
                    f"DTSTART:{day_str}T{st}",
                    f"DTEND:{day_str}T{et}",
                    f"SUMMARY:{shift.name} - WorkSphere",
                    f"DESCRIPTION:Assigned Work Shift ({shift.start_time} - {shift.end_time}) at WorkSphere Tech HQ.",
                    "LOCATION:WorkSphere Tech Pvt Ltd, Bengaluru",
                    "STATUS:CONFIRMED",
                    "END:VEVENT"
                ])

    # Add Approved Leaves
    if emp and emp.leaves:
        for lv in emp.leaves:
            if lv.status == models.LeaveStatus.APPROVED:
                st_day = lv.start_date.strftime("%Y%m%d")
                end_day = (lv.end_date + timedelta(days=1)).strftime("%Y%m%d")
                ics_lines.extend([
                    "BEGIN:VEVENT",
                    f"UID:leave-{lv.id}@worksphere.co.in",
                    f"DTSTAMP:{now_str}",
                    f"DTSTART;VALUE=DATE:{st_day}",
                    f"DTEND;VALUE=DATE:{end_day}",
                    f"SUMMARY:Approved Leave: {lv.leave_type.value}",
                    f"DESCRIPTION:Approved Leave ({lv.leave_type.value}) - Reason: {lv.reason}",
                    "STATUS:CONFIRMED",
                    "END:VEVENT"
                ])

    # Add Company Onboarding / Tasks
    if emp and emp.onboardings:
        for ob in emp.onboardings:
            d_str = ob.due_date.strftime("%Y%m%d")
            ics_lines.extend([
                "BEGIN:VEVENT",
                f"UID:onboard-{ob.id}@worksphere.co.in",
                f"DTSTAMP:{now_str}",
                f"DTSTART;VALUE=DATE:{d_str}",
                f"DTEND;VALUE=DATE:{d_str}",
                f"SUMMARY:Onboarding Due: {ob.task_name}",
                f"DESCRIPTION:Status: {ob.status.value}",
                "STATUS:CONFIRMED",
                "END:VEVENT"
            ])

    ics_lines.append("END:VCALENDAR")
    ics_content = "\r\n".join(ics_lines)

    filename = f"worksphere_schedule_{current_user.username}.ics"
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/csv")
def export_reports_csv(
    report_type: str = Query(..., description="employees | attendance | payroll | leaves | onboarding | resignations"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    """
    Exports clean, formatted CSV datasets for executive reporting and auditing.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "employees":
        writer.writerow(["ID", "Full Name", "Email", "Department", "Designation", "Joining Date", "Salary", "Status", "Phone"])
        employees = db.query(models.Employee).all()
        for e in employees:
            writer.writerow([
                e.id,
                e.full_name,
                e.user.email if e.user else "",
                e.department,
                e.designation,
                e.joining_date.isoformat(),
                e.salary,
                e.status.value,
                e.phone or ""
            ])
        filename = f"worksphere_employees_{date.today().isoformat()}.csv"

    elif report_type == "attendance":
        writer.writerow(["Attendance ID", "Employee Name", "Department", "Date", "Check In", "Check Out", "Working Hours", "Status", "Is Late", "Late Mins", "Overtime Hrs"])
        attendances = db.query(models.Attendance).join(models.Employee).order_by(models.Attendance.date.desc()).all()
        for a in attendances:
            writer.writerow([
                a.id,
                a.employee.full_name if a.employee else "",
                a.employee.department if a.employee else "",
                a.date.isoformat(),
                a.check_in.strftime("%H:%M:%S") if a.check_in else "",
                a.check_out.strftime("%H:%M:%S") if a.check_out else "",
                a.working_hours,
                a.status.value,
                "YES" if a.is_late else "NO",
                a.late_minutes,
                a.overtime_hours
            ])
        filename = f"worksphere_attendance_{date.today().isoformat()}.csv"

    elif report_type == "payroll":
        writer.writerow(["Payroll ID", "Employee Name", "Department", "Month", "Basic Salary", "HRA", "Special Allowance", "Bonus", "PF Deduction", "Tax Deduction", "Total Deductions", "Net Salary"])
        payrolls = db.query(models.Payroll).join(models.Employee).order_by(models.Payroll.id.desc()).all()
        for p in payrolls:
            writer.writerow([
                p.id,
                p.employee.full_name if p.employee else "",
                p.employee.department if p.employee else "",
                p.month,
                p.basic_salary,
                p.hra,
                p.special_allowance,
                p.bonus,
                p.pf_deduction,
                p.tax_deduction,
                p.deductions,
                p.net_salary
            ])
        filename = f"worksphere_payroll_{date.today().isoformat()}.csv"

    elif report_type == "leaves":
        writer.writerow(["Leave ID", "Employee Name", "Department", "Leave Type", "Start Date", "End Date", "Reason", "Status", "Applied On"])
        leaves = db.query(models.Leave).join(models.Employee).order_by(models.Leave.created_at.desc()).all()
        for l in leaves:
            writer.writerow([
                l.id,
                l.employee.full_name if l.employee else "",
                l.employee.department if l.employee else "",
                l.leave_type.value,
                l.start_date.isoformat(),
                l.end_date.isoformat(),
                l.reason,
                l.status.value,
                l.created_at.strftime("%Y-%m-%d %H:%M:%S")
            ])
        filename = f"worksphere_leaves_{date.today().isoformat()}.csv"

    elif report_type == "onboarding":
        writer.writerow(["Task ID", "Employee Name", "Department", "Task Name", "Status", "Due Date"])
        onboardings = db.query(models.Onboarding).join(models.Employee).order_by(models.Onboarding.due_date.asc()).all()
        for o in onboardings:
            writer.writerow([
                o.id,
                o.employee.full_name if o.employee else "",
                o.employee.department if o.employee else "",
                o.task_name,
                o.status.value,
                o.due_date.isoformat()
            ])
        filename = f"worksphere_onboarding_{date.today().isoformat()}.csv"

    elif report_type == "resignations":
        writer.writerow(["Resignation ID", "Employee Name", "Department", "Notice Period", "Status", "Reason", "Submitted On"])
        resignations = db.query(models.Resignation).join(models.Employee).order_by(models.Resignation.created_at.desc()).all()
        for r in resignations:
            writer.writerow([
                r.id,
                r.employee.full_name if r.employee else "",
                r.employee.department if r.employee else "",
                r.notice_period,
                r.status.value,
                r.reason,
                r.created_at.strftime("%Y-%m-%d %H:%M:%S")
            ])
        filename = f"worksphere_resignations_{date.today().isoformat()}.csv"

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid report type '{report_type}'. Supported: employees, attendance, payroll, leaves, onboarding, resignations"
        )

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
