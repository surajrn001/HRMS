from datetime import datetime, date, timedelta
from database import SessionLocal, engine, Base
from models import (
    User, Employee, Attendance, Leave, Payroll, Notification,
    LeavePolicy, LeaveBalance,
    UserRole, EmployeeStatus, AttendanceStatus, LeaveType, LeaveStatus
)
from auth import get_password_hash

def seed(force_reset: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if not force_reset and db.query(User).count() > 0:
        db.close()
        return

    if force_reset:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()

    # 1. Accounts
    accounts = [
        ("admin", "rajesh.sharma@worksphere.co.in", "admin123", UserRole.ADMIN, True),
        ("neha_hr", "neha.kulkarni@worksphere.co.in", "hr123", UserRole.HR, True),
        ("suraj", "suraj@worksphere.co.in", "emp123", UserRole.EMPLOYEE, True),
        ("priya_ui", "priya.nair@worksphere.co.in", "emp123", UserRole.EMPLOYEE, True),
        ("rohit_qa", "rohit.deshmukh@worksphere.co.in", "emp123", UserRole.EMPLOYEE, True),
        ("sneha_fin", "sneha.iyer@worksphere.co.in", "emp123", UserRole.EMPLOYEE, True),
        ("vikram_sales", "vikram.malhotra@worksphere.co.in", "emp123", UserRole.EMPLOYEE, True),
        ("kunal_contractor", "kunal.verma@worksphere.co.in", "emp123", UserRole.EMPLOYEE, False),
    ]

    users = {}
    for username, email, pwd, role, is_act in accounts:
        u = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(pwd),
            role=role,
            is_active=is_act,
            created_at=datetime.now() - timedelta(days=120)
        )
        db.add(u)
        users[username] = u
    db.commit()

    # 2. Employees roster
    roster = [
        ("admin", "Rajesh Sharma", "Director of Engineering & Systems Admin", "Executive Management", date(2022, 4, 1), 240000.0, EmployeeStatus.ACTIVE),
        ("neha_hr", "Neha Kulkarni", "Manager - People Operations & HR", "Human Resources", date(2023, 2, 15), 115000.0, EmployeeStatus.ACTIVE),
        ("suraj", "Suraj", "Senior Full-Stack Engineer", "Engineering", date(2023, 7, 1), 135000.0, EmployeeStatus.ACTIVE),
        ("priya_ui", "Priya Nair", "Lead UI/UX Product Designer", "Design & UX", date(2023, 11, 10), 95000.0, EmployeeStatus.ACTIVE),
        ("rohit_qa", "Rohit Deshmukh", "QA Automation Engineer", "Engineering", date(2024, 1, 15), 78000.0, EmployeeStatus.ACTIVE),
        ("sneha_fin", "Sneha Iyer", "Senior Accounts & Payroll Executive", "Finance & Accounts", date(2024, 3, 1), 85000.0, EmployeeStatus.ACTIVE),
        ("vikram_sales", "Vikram Malhotra", "Business Development Manager", "Sales & Growth", date(2024, 5, 20), 105000.0, EmployeeStatus.ACTIVE),
        ("kunal_contractor", "Kunal Verma", "Contract Frontend Consultant", "Engineering", date(2024, 8, 1), 70000.0, EmployeeStatus.INACTIVE),
    ]

    staff = {}
    for uname, name, title, dept, doj, salary, emp_stat in roster:
        emp = Employee(
            user_id=users[uname].id,
            full_name=name,
            designation=title,
            department=dept,
            joining_date=doj,
            salary=salary,
            status=emp_stat
        )
        db.add(emp)
        staff[uname] = emp
    db.commit()

    # 3. Leave Policies
    policies = [
        LeavePolicy(leave_type=LeaveType.CASUAL, total_days_allowed=12.0, description="Annual casual leaves for personal work, emergencies, and festive occasions"),
        LeavePolicy(leave_type=LeaveType.SICK, total_days_allowed=10.0, description="Medical leave for sickness, health appointments, and doctor-prescribed recovery"),
        LeavePolicy(leave_type=LeaveType.PAID, total_days_allowed=18.0, description="Earned annual privilege vacation leave for rest, travel, and personal recharge"),
    ]
    db.add_all(policies)
    db.commit()

    # 4. Leave Balances for all active employees
    balances = []
    for uname, emp in staff.items():
        if uname == "suraj":
            balances.extend([
                LeaveBalance(employee_id=emp.id, leave_type=LeaveType.CASUAL, total_days=12.0, used_days=2.0, remaining_days=10.0),
                LeaveBalance(employee_id=emp.id, leave_type=LeaveType.SICK, total_days=10.0, used_days=0.0, remaining_days=10.0),
                LeaveBalance(employee_id=emp.id, leave_type=LeaveType.PAID, total_days=18.0, used_days=4.0, remaining_days=14.0),
            ])
        elif uname == "priya_ui":
            balances.extend([
                LeaveBalance(employee_id=emp.id, leave_type=LeaveType.CASUAL, total_days=12.0, used_days=4.0, remaining_days=8.0),
                LeaveBalance(employee_id=emp.id, leave_type=LeaveType.SICK, total_days=10.0, used_days=1.0, remaining_days=9.0),
                LeaveBalance(employee_id=emp.id, leave_type=LeaveType.PAID, total_days=18.0, used_days=3.0, remaining_days=15.0),
            ])
        else:
            balances.extend([
                LeaveBalance(employee_id=emp.id, leave_type=LeaveType.CASUAL, total_days=12.0, used_days=1.0, remaining_days=11.0),
                LeaveBalance(employee_id=emp.id, leave_type=LeaveType.SICK, total_days=10.0, used_days=2.0, remaining_days=8.0),
                LeaveBalance(employee_id=emp.id, leave_type=LeaveType.PAID, total_days=18.0, used_days=2.0, remaining_days=16.0),
            ])
    db.add_all(balances)
    db.commit()

    # 5. Attendance History with Late Entries and Overtime
    today = date.today()
    shifts = []
    for d in range(6, 0, -1):
        day = today - timedelta(days=d)
        if day.weekday() >= 5:
            continue
        for uname, emp in staff.items():
            if emp.status != EmployeeStatus.ACTIVE:
                continue

            # Alternate on-time, late, and overtime for realistic simulation
            if d % 3 == 0 and uname in ["priya_ui", "rohit_qa"]:
                # Late check-in at 09:55
                cin = datetime.combine(day, datetime.min.time()).replace(hour=9, minute=55)
                cout = datetime.combine(day, datetime.min.time()).replace(hour=18, minute=30)
                diff = (cout - cin).total_seconds() / 3600.0
                shifts.append(Attendance(
                    employee_id=emp.id,
                    date=day,
                    check_in=cin,
                    check_out=cout,
                    working_hours=round(diff, 2),
                    status=AttendanceStatus.PRESENT,
                    is_late=True,
                    late_minutes=25,
                    overtime_hours=round(max(0.0, diff - 8.0), 2)
                ))
            elif d % 2 == 0 and uname in ["suraj", "admin"]:
                # Overtime shift: 09:15 to 19:15 (10.0 hrs, 2.0 hrs OT)
                cin = datetime.combine(day, datetime.min.time()).replace(hour=9, minute=15)
                cout = datetime.combine(day, datetime.min.time()).replace(hour=19, minute=15)
                diff = (cout - cin).total_seconds() / 3600.0
                shifts.append(Attendance(
                    employee_id=emp.id,
                    date=day,
                    check_in=cin,
                    check_out=cout,
                    working_hours=round(diff, 2),
                    status=AttendanceStatus.PRESENT,
                    is_late=False,
                    late_minutes=0,
                    overtime_hours=round(max(0.0, diff - 8.0), 2)
                ))
            else:
                # Regular On-time punch
                cin = datetime.combine(day, datetime.min.time()).replace(hour=9, minute=20)
                cout = datetime.combine(day, datetime.min.time()).replace(hour=18, minute=20)
                diff = (cout - cin).total_seconds() / 3600.0
                shifts.append(Attendance(
                    employee_id=emp.id,
                    date=day,
                    check_in=cin,
                    check_out=cout,
                    working_hours=round(diff, 2),
                    status=AttendanceStatus.PRESENT,
                    is_late=False,
                    late_minutes=0,
                    overtime_hours=0.0
                ))

    # Today's Morning Punches
    # Neha: On-time
    shifts.append(Attendance(
        employee_id=staff["neha_hr"].id,
        date=today,
        check_in=datetime.combine(today, datetime.min.time()).replace(hour=9, minute=15),
        check_out=None,
        working_hours=0.0,
        status=AttendanceStatus.PRESENT,
        is_late=False,
        late_minutes=0,
        overtime_hours=0.0
    ))
    # Suraj: Punched in late (09:48 AM, 18 mins late)
    shifts.append(Attendance(
        employee_id=staff["suraj"].id,
        date=today,
        check_in=datetime.combine(today, datetime.min.time()).replace(hour=9, minute=48),
        check_out=None,
        working_hours=0.0,
        status=AttendanceStatus.PRESENT,
        is_late=True,
        late_minutes=18,
        overtime_hours=0.0
    ))
    db.add_all(shifts)

    # 6. Leaves
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

    # 7. Enhanced Payroll with Breakdown
    curr_month = today.strftime("%B %Y")
    prev_month = (today.replace(day=1) - timedelta(days=1)).strftime("%B %Y")

    payrolls = []
    for uname, emp in staff.items():
        if emp.status != EmployeeStatus.ACTIVE:
            continue
        basic = round(emp.salary * 0.50, 2)
        hra = round(emp.salary * 0.30, 2)
        special = round(emp.salary * 0.20, 2)
        bonus = 6000.0 if emp.department == "Engineering" else 3000.0
        pf = round(basic * 0.12, 2)
        tax = round(emp.salary * 0.06 + 200.0, 2)
        tot_deductions = round(pf + tax, 2)
        net = round((basic + hra + special + bonus) - tot_deductions, 2)

        for month_label, age_days in [(prev_month, 25), (curr_month, 1)]:
            payrolls.append(Payroll(
                employee_id=emp.id,
                basic_salary=basic,
                hra=hra,
                special_allowance=special,
                bonus=bonus,
                pf_deduction=pf,
                tax_deduction=tax,
                deductions=tot_deductions,
                net_salary=net,
                month=month_label,
                created_at=datetime.now() - timedelta(days=age_days)
            ))
    db.add_all(payrolls)

    # 8. Notifications
    notifications = [
        (users["admin"].id, "WorkSphere Phase 2 Operational", "Role-Based Access Control, ESS Portal, Advanced Attendance & Leave Balance engines are online.", False),
        (users["admin"].id, "Security Audit: 1 Deactivated Account", "User account 'kunal_contractor' is marked inactive in system registry.", False),
        (users["neha_hr"].id, "Pending Leave Approval", "Priya Nair submitted a Casual Leave request (2 days). Please review and approve.", False),
        (users["suraj"].id, f"Salary Credited for {curr_month}", f"Your monthly payslip for {curr_month} is generated. Net: ₹{payrolls[-1].net_salary:,.2f}.", False),
        (users["suraj"].id, "Late Punch Alert", "Today's check-in was registered at 09:48 AM (18 minutes past shift start time).", False),
        (users["suraj"].id, "Diwali Leave Approved", "Your 5-day Paid Leave for Diwali has been approved. 14 days remaining in Paid balance.", True),
    ]

    for uid, title, msg, read in notifications:
        db.add(Notification(user_id=uid, title=title, message=msg, is_read=read))

    db.commit()
    db.close()
    print("Database successfully seeded for Phase 2 (RBAC, Leave Policies, Balances, Attendance Controls, Payroll Breakdown, and Admin Users).")

if __name__ == "__main__":
    seed(force_reset=True)
