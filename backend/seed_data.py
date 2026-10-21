from datetime import datetime, date, timedelta
from database import SessionLocal, engine, Base
from models import (
    User, Employee, Attendance, Leave, Payroll, Notification,
    UserRole, EmployeeStatus, AttendanceStatus, LeaveType, LeaveStatus
)
from auth import get_password_hash

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # nuke existing rows for clean restart
    for model in (Notification, Payroll, Leave, Attendance, Employee, User):
        db.query(model).delete()
    db.commit()

    accounts = [
        ("admin", "rajesh.sharma@worksphere.co.in", "admin123", UserRole.ADMIN),
        ("neha_hr", "neha.kulkarni@worksphere.co.in", "hr123", UserRole.HR),
        ("suraj", "suraj@worksphere.co.in", "emp123", UserRole.EMPLOYEE),
        ("priya_ui", "priya.nair@worksphere.co.in", "emp123", UserRole.EMPLOYEE),
        ("rohit_qa", "rohit.deshmukh@worksphere.co.in", "emp123", UserRole.EMPLOYEE),
        ("sneha_fin", "sneha.iyer@worksphere.co.in", "emp123", UserRole.EMPLOYEE),
        ("vikram_sales", "vikram.malhotra@worksphere.co.in", "emp123", UserRole.EMPLOYEE),
    ]

    users = {}
    for username, email, pwd, role in accounts:
        u = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(pwd),
            role=role,
            created_at=datetime.now() - timedelta(days=120)
        )
        db.add(u)
        users[username] = u
    db.commit()

    roster = [
        ("admin", "Rajesh Sharma", "Director of Engineering & Systems Admin", "Executive Management", date(2022, 4, 1), 240000.0),
        ("neha_hr", "Neha Kulkarni", "Manager - People Operations & HR", "Human Resources", date(2023, 2, 15), 115000.0),
        ("suraj", "Suraj", "Senior Full-Stack Engineer", "Engineering", date(2023, 7, 1), 135000.0),
        ("priya_ui", "Priya Nair", "Lead UI/UX Product Designer", "Design & UX", date(2023, 11, 10), 95000.0),
        ("rohit_qa", "Rohit Deshmukh", "QA Automation Engineer", "Engineering", date(2024, 1, 15), 78000.0),
        ("sneha_fin", "Sneha Iyer", "Senior Accounts & Payroll Executive", "Finance & Accounts", date(2024, 3, 1), 85000.0),
        ("vikram_sales", "Vikram Malhotra", "Business Development Manager", "Sales & Growth", date(2024, 5, 20), 105000.0),
    ]

    staff = {}
    for uname, name, title, dept, doj, salary in roster:
        emp = Employee(
            user_id=users[uname].id,
            full_name=name,
            designation=title,
            department=dept,
            joining_date=doj,
            salary=salary,
            status=EmployeeStatus.ACTIVE
        )
        db.add(emp)
        staff[uname] = emp
    db.commit()

    today = date.today()

    # last 5 workdays attendance
    shifts = []
    for d in range(5, 0, -1):
        day = today - timedelta(days=d)
        if day.weekday() >= 5:
            continue
        for emp in staff.values():
            shifts.append(Attendance(
                employee_id=emp.id,
                date=day,
                check_in=datetime.combine(day, datetime.min.time()).replace(hour=9, minute=25),
                check_out=datetime.combine(day, datetime.min.time()).replace(hour=18, minute=35),
                working_hours=9.1,
                status=AttendanceStatus.PRESENT
            ))

    # today's morning punches
    for uname, h, m in [("neha_hr", 9, 10), ("suraj", 9, 45), ("priya_ui", 10, 0)]:
        shifts.append(Attendance(
            employee_id=staff[uname].id,
            date=today,
            check_in=datetime.combine(today, datetime.min.time()).replace(hour=h, minute=m),
            check_out=None,
            working_hours=0.0,
            status=AttendanceStatus.PRESENT
        ))
    db.add_all(shifts)

    leave_requests = [
        ("suraj", LeaveType.PAID, 8, 12, "Traveling to hometown (Lucknow) for Diwali celebrations with family", LeaveStatus.APPROVED),
        ("priya_ui", LeaveType.CASUAL, 2, 3, "Attending cousin's wedding ceremony in Kochi", LeaveStatus.PENDING),
        ("rohit_qa", LeaveType.SICK, -2, -1, "Viral fever and doctor advised 2 days bed rest", LeaveStatus.APPROVED),
        ("vikram_sales", LeaveType.CASUAL, 5, 6, "RTO appointment for driving license renewal and bank document verification", LeaveStatus.PENDING),
        ("sneha_fin", LeaveType.PAID, -15, -14, "Family vacation to Ooty", LeaveStatus.APPROVED),
    ]

    for uname, kind, start_offset, end_offset, reason, status in leave_requests:
        db.add(Leave(
            employee_id=staff[uname].id,
            leave_type=kind,
            start_date=today + timedelta(days=start_offset),
            end_date=today + timedelta(days=end_offset),
            reason=reason,
            status=status,
            created_at=datetime.now() - timedelta(days=2)
        ))

    curr_month = today.strftime("%B %Y")
    prev_month = (today.replace(day=1) - timedelta(days=1)).strftime("%B %Y")

    # generate 2 cycles of pay slips (prev + current)
    payrolls = []
    for emp in staff.values():
        bonus = 5000.0 if emp.department == "Engineering" else 2500.0
        # standard 10% tax/PF + flat 200 PT deduction
        deductions = round((emp.salary * 0.10) + 200.0, 2)
        net = round(emp.salary + bonus - deductions, 2)

        for month_label, age_days in [(prev_month, 25), (curr_month, 1)]:
            payrolls.append(Payroll(
                employee_id=emp.id,
                basic_salary=emp.salary,
                bonus=bonus,
                deductions=deductions,
                net_salary=net,
                month=month_label,
                created_at=datetime.now() - timedelta(days=age_days)
            ))
    db.add_all(payrolls)

    notifications = [
        (users["admin"].id, "WorkSphere Portal Live", "HRMS operations for WorkSphere Technologies Bengaluru hub are active.", False),
        (users["neha_hr"].id, "New Leave Request from Priya Nair", "Priya Nair submitted a Casual Leave request (2 days for cousin's wedding in Kochi).", False),
        (users["suraj"].id, f"Salary Credited for {curr_month}", f"Your monthly salary has been processed and credited to your salary account. Net: ₹{staff['suraj'].salary + 5000 - round(staff['suraj'].salary * 0.10 + 200):,}.", False),
        (users["suraj"].id, "Diwali Leave Approved", "Your Paid Leave application for Diwali festival has been approved by Neha Kulkarni.", True),
    ]

    for uid, title, msg, read in notifications:
        db.add(Notification(user_id=uid, title=title, message=msg, is_read=read))

    db.commit()
    db.close()
    print("Seeded successfully with Suraj as developer.")

if __name__ == "__main__":
    seed()
