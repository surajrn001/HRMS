from datetime import datetime, date, timedelta
from database import SessionLocal, engine, Base
from models import (
    User, Employee, Attendance, Leave, Payroll, Notification,
    LeavePolicy, LeaveBalance, Shift, EmployeeShift, Document, Performance,
    Onboarding, Resignation, Announcement, Task, Feedback, UserSettings,
    UserRole, EmployeeStatus, AttendanceStatus, LeaveType, LeaveStatus,
    OnboardingStatus, ResignationStatus, TaskStatus
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

    # User Settings for all accounts
    for u in users.values():
        db.add(UserSettings(
            user_id=u.id,
            email_notifications=True,
            in_app_notifications=True,
            leave_alerts=True,
            task_alerts=True,
            announcement_alerts=True
        ))
    db.commit()

    # 2. Employees roster with rich profile information
    roster = [
        ("admin", "Rajesh Sharma", "Director of Engineering & Systems Admin", "Executive Management", date(2022, 4, 1), 240000.0, EmployeeStatus.ACTIVE, "+91 98765 43210", "Indiranagar, Bengaluru, Karnataka", "+91 98765 00001 (Spouse)", "Passionate engineering leader overseeing enterprise architecture, platforms and cloud infrastructure."),
        ("neha_hr", "Neha Kulkarni", "Manager - People Operations & HR", "Human Resources", date(2023, 2, 15), 115000.0, EmployeeStatus.ACTIVE, "+91 98765 43211", "Koramangala 4th Block, Bengaluru", "+91 98765 00002 (Brother)", "Dedicated to fostering transparent employee culture, talent growth, and seamless workplace experiences."),
        ("suraj", "Suraj", "Senior Full-Stack Engineer", "Engineering", date(2023, 7, 1), 135000.0, EmployeeStatus.ACTIVE, "+91 98765 43212", "HSR Layout Sector 2, Bengaluru", "+91 98765 00003 (Father)", "Core full-stack developer specializing in scalable distributed microservices, React, and Python ecosystems."),
        ("priya_ui", "Priya Nair", "Lead UI/UX Product Designer", "Design & UX", date(2023, 11, 10), 95000.0, EmployeeStatus.ACTIVE, "+91 98765 43213", "BTM Layout 2nd Stage, Bengaluru", "+91 98765 00004 (Mother)", "Crafting human-centered design systems, micro-interactions, and accessible web experiences."),
        ("rohit_qa", "Rohit Deshmukh", "QA Automation Engineer", "Engineering", date(2024, 1, 15), 78000.0, EmployeeStatus.ACTIVE, "+91 98765 43214", "Whitefield, Bengaluru", "+91 98765 00005 (Sister)", "Champion of automated test pipelines, reliability engineering, and continuous integration."),
        ("sneha_fin", "Sneha Iyer", "Senior Accounts & Payroll Executive", "Finance & Accounts", date(2024, 3, 1), 85000.0, EmployeeStatus.ACTIVE, "+91 98765 43215", "JP Nagar 7th Phase, Bengaluru", "+91 98765 00006 (Spouse)", "Managing payroll calculations, compliance governance, tax filings, and institutional compensation."),
        ("vikram_sales", "Vikram Malhotra", "Business Development Manager", "Sales & Growth", date(2024, 5, 20), 105000.0, EmployeeStatus.ACTIVE, "+91 98765 43216", "Bellandur, Bengaluru", "+91 98765 00007 (Spouse)", "Scaling enterprise HRMS partnerships across India and Southeast Asia."),
        ("kunal_contractor", "Kunal Verma", "Contract Frontend Consultant", "Engineering", date(2024, 8, 1), 70000.0, EmployeeStatus.INACTIVE, "+91 98765 43217", "Marathahalli, Bengaluru", "+91 98765 00008 (Friend)", "Former contract engineer. Exit formalities completed."),
    ]

    staff = {}
    for uname, name, title, dept, doj, salary, emp_stat, phone, addr, e_contact, bio in roster:
        emp = Employee(
            user_id=users[uname].id,
            full_name=name,
            designation=title,
            department=dept,
            joining_date=doj,
            salary=salary,
            status=emp_stat,
            phone=phone,
            address=addr,
            emergency_contact=e_contact,
            bio=bio
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
    db.commit()

    # 8. Shifts & Employee Shift Assignments (Module 14)
    shifts = [
        Shift(name="General Shift", start_time="09:30", end_time="18:30", description="Standard corporate hours with core team alignment"),
        Shift(name="Morning Shift", start_time="08:00", end_time="16:30", description="Early coverage for infrastructure, release, and live support"),
        Shift(name="Evening Shift", start_time="14:00", end_time="22:30", description="Afternoon-evening handover & international client coverage"),
        Shift(name="Night Shift", start_time="22:00", end_time="06:30", description="Overnight 24/7 security, ops, and critical systems monitoring"),
    ]
    db.add_all(shifts)
    db.commit()

    shift_map = {s.name: s for s in shifts}
    emp_shift_assignments = [
        ("admin", "General Shift"),
        ("neha_hr", "General Shift"),
        ("suraj", "General Shift"),
        ("priya_ui", "General Shift"),
        ("rohit_qa", "Morning Shift"),
        ("sneha_fin", "General Shift"),
        ("vikram_sales", "Evening Shift"),
        ("kunal_contractor", "Morning Shift"),
    ]
    for uname, sname in emp_shift_assignments:
        db.add(EmployeeShift(
            employee_id=staff[uname].id,
            shift_id=shift_map[sname].id,
            assigned_date=today - timedelta(days=60),
            is_active=True
        ))
    db.commit()

    # 9. Document Management System (Module 16)
    import os
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    sample_docs = [
        (staff["suraj"].id, "Government ID Proof", "Identity Document", "aadhaar_suraj_verified.pdf", "Official Government Identity Document verified by HR"),
        (staff["suraj"].id, "Appointment & Offer Letter", "Offer Letter", "offer_letter_suraj_lead.pdf", "WorkSphere Senior Engineering Offer & Compensation Breakdown"),
        (staff["suraj"].id, "Degree Certificate", "Academic", "btech_degree_suraj.pdf", "Bachelor of Engineering (Computer Science) Degree Certificate"),
        (staff["priya_ui"].id, "Design Portfolio & Credentials", "Certificate", "portfolio_priya_lead.pdf", "Product Design Certification & UX Portfolio Summary"),
        (staff["rohit_qa"].id, "ISTQB Certification", "Certificate", "istqb_rohit_advanced.pdf", "ISTQB Advanced Test Automation Engineer Certificate"),
        (staff["sneha_fin"].id, "Chartered Accountant Accreditation", "Academic", "ca_intermediate_sneha.pdf", "Finance and Statutory Accounting Credentials"),
    ]

    for eid, title, dtype, fname, content in sample_docs:
        file_path = os.path.join(uploads_dir, fname)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(f"--- WorkSphere HRMS Confidential Document ---\nTitle: {title}\nType: {dtype}\nEmployee ID: {eid}\nContent: {content}\nTimestamp: {datetime.now().isoformat()}\n")
        
        fsize = os.path.getsize(file_path)
        db.add(Document(
            employee_id=eid,
            title=title,
            document_type=dtype,
            file_name=fname,
            file_url=fname,
            file_size=fsize,
            uploaded_at=datetime.now() - timedelta(days=15)
        ))
    db.commit()

    # 10. Performance Management System (Module 17)
    perf_reviews = [
        (staff["suraj"].id, "Q1 2026", 4.8, "Delivered resilient full-stack architecture with outstanding code craftsmanship and clean documentation.", "Rajesh Sharma", "Implement real-time notification socket & analytics engine"),
        (staff["suraj"].id, "Q2 2026", 4.9, "Spearheaded Phase 3 HRMS automation, shift scheduling, and smart analytics with zero production bugs.", "Rajesh Sharma", "Lead technical architecture reviews for cloud migration"),
        (staff["priya_ui"].id, "Q2 2026", 4.7, "Designed modern, human-crafted UI layouts with intuitive navigation and harmonious typography.", "Rajesh Sharma", "Optimize design system tokens and accessibility contrast"),
        (staff["rohit_qa"].id, "Q2 2026", 4.2, "Exemplary testing coverage across payroll algorithms and leave balance state transitions.", "Neha Kulkarni", "Increase automated end-to-end integration test coverage"),
        (staff["sneha_fin"].id, "Q2 2026", 4.6, "Ensured 100% error-free monthly salary disbursement and strict statutory PF tax compliance.", "Rajesh Sharma", "Automate bank payout ledger file generation"),
        (staff["vikram_sales"].id, "Q2 2026", 4.5, "Exceeded regional business growth targets by 24% and closed critical enterprise clients.", "Rajesh Sharma", "Scale enterprise partnerships in western region"),
    ]

    for eid, period, rating, feedback, reviewer, goals in perf_reviews:
        db.add(Performance(
            employee_id=eid,
            review_period=period,
            rating=rating,
            feedback=feedback,
            reviewer_name=reviewer,
            goals=goals,
            created_at=datetime.now() - timedelta(days=20)
        ))
    db.commit()

    # 11. Smart Notifications with Categorization (Module 19)
    notifications = [
        (users["admin"].id, "WorkSphere Phase 3 Online", "Shift scheduling, Leave Calendar, Document Vault, Performance & Advanced Analytics are active.", "SYSTEM", False),
        (users["admin"].id, "Security Audit: Inactive Account", "User account 'kunal_contractor' is marked inactive in system registry.", "SYSTEM", False),
        (users["neha_hr"].id, "Pending Leave Request", "Priya Nair submitted a Casual Leave request (2 days). Check team calendar for conflicts.", "LEAVE", False),
        (users["suraj"].id, "Shift Assigned: General Shift", "You have been assigned to General Shift (09:30 AM - 06:30 PM).", "SHIFT", False),
        (users["suraj"].id, f"Salary Credited for {curr_month}", f"Payslip for {curr_month} is generated. Net Disbursed: ₹{payrolls[-1].net_salary:,.2f}.", "PAYROLL", False),
        (users["suraj"].id, "Performance Review Published", "Rajesh Sharma recorded your Q2 2026 performance rating (4.9★ Outstanding).", "PERFORMANCE", False),
        (users["suraj"].id, "Late Punch Alert", "Today's check-in was registered at 09:48 AM (18 minutes past General Shift start).", "ATTENDANCE", False),
        (users["suraj"].id, "Document Verified by HR", "Your 'Government ID Proof' has been verified and stored in the secure document vault.", "DOCUMENT", True),
    ]

    for uid, title, msg, cat, read in notifications:
        db.add(Notification(user_id=uid, title=title, message=msg, category=cat, is_read=read))

    # 12. Onboarding System (Module 21)
    onboard_tasks = [
        # Suraj
        (staff["suraj"].id, "Submit Identity & Tax Proof Documents", OnboardingStatus.COMPLETED, today - timedelta(days=10)),
        (staff["suraj"].id, "Complete Workstation & Security Credentials Setup", OnboardingStatus.COMPLETED, today - timedelta(days=8)),
        (staff["suraj"].id, "Attend Engineering Architecture & Codebase Walkthrough", OnboardingStatus.COMPLETED, today - timedelta(days=5)),
        (staff["suraj"].id, "Review Production Release & CI/CD Guidelines", OnboardingStatus.PENDING, today + timedelta(days=3)),
        # Priya
        (staff["priya_ui"].id, "Sign Employee Agreement & Non-Disclosure NDA", OnboardingStatus.COMPLETED, today - timedelta(days=15)),
        (staff["priya_ui"].id, "Setup Figma Enterprise Workspace & UI Assets", OnboardingStatus.COMPLETED, today - timedelta(days=12)),
        (staff["priya_ui"].id, "Review Design System Component Tokens & Guidelines", OnboardingStatus.COMPLETED, today - timedelta(days=7)),
        (staff["priya_ui"].id, "Complete HR Culture & WorkSphere Introduction", OnboardingStatus.COMPLETED, today - timedelta(days=4)),
        # Vikram
        (staff["vikram_sales"].id, "Submit Previous Employer Relieving & Experience Letter", OnboardingStatus.COMPLETED, today - timedelta(days=6)),
        (staff["vikram_sales"].id, "Configure CRM Account & Sales Playbook Setup", OnboardingStatus.COMPLETED, today - timedelta(days=3)),
        (staff["vikram_sales"].id, "Shadow Lead Sales Executive on Enterprise Demo", OnboardingStatus.PENDING, today + timedelta(days=2)),
        (staff["vikram_sales"].id, "Complete Anti-Bribery & Compliance Certification", OnboardingStatus.PENDING, today + timedelta(days=5)),
        (staff["vikram_sales"].id, "Attend Sales Target & Territory Alignment Meeting", OnboardingStatus.PENDING, today + timedelta(days=9)),
    ]
    for eid, tname, stat, ddate in onboard_tasks:
        db.add(Onboarding(employee_id=eid, task_name=tname, status=stat, due_date=ddate))
    db.commit()

    # 13. Resignation & Exit Management (Module 22)
    db.add(Resignation(
        employee_id=staff["kunal_contractor"].id,
        reason="Admitted to Master of Science program at RWTH Aachen University, Germany. Sincere thanks for the valuable experience!",
        notice_period="30 Days",
        status=ResignationStatus.APPROVED,
        created_at=datetime.utcnow() - timedelta(days=40)
    ))
    db.commit()

    # 14. Internal Announcements (Module 23)
    announcements_data = [
        ("🎉 Annual WorkSphere Tech Summit & Hackathon 2026", "We are thrilled to announce our 4th Annual Engineering Summit in Bengaluru on November 14-15! Register your teams for the 24-hour innovation hackathon with exciting cash prizes and executive mentorship.", users["admin"].id, 2),
        ("📢 Updated Flexible Hybrid Work Policy & Core Collaboration Hours", "Effective this month, team members can utilize up to 2 remote workdays per week with manager coordination. Core collaboration hours remain 10:30 AM to 04:30 PM across all departments.", users["neha_hr"].id, 5),
        ("🌟 WorkSphere Achieves ISO 27001 & SOC-2 Type II Certification", "Hearty congratulations to our Security, QA, and Engineering teams on successfully clearing the rigorous external security and data privacy audits with zero findings!", users["admin"].id, 8),
        ("🌿 Comprehensive Employee Health & Wellness Coverage Upgrade", "Our group medical insurance coverage has been enhanced to ₹10,00,000 per family unit, now including complimentary annual executive health checkups and mental wellness sessions.", users["neha_hr"].id, 14),
    ]
    for title, msg, author_id, days_ago in announcements_data:
        db.add(Announcement(
            title=title,
            message=msg,
            created_by=author_id,
            created_at=datetime.utcnow() - timedelta(days=days_ago)
        ))
    db.commit()

    # 15. Task Assignment & Tracking (Module 24)
    tasks_data = [
        (staff["suraj"].id, "Implement Google Calendar & iCal Export Engine", "Develop standard RFC 5545 calendar feed generation for employee shifts and leaves.", today + timedelta(days=3), TaskStatus.COMPLETED),
        (staff["suraj"].id, "Refactor Notification Broadcast Queue", "Optimize database queries and add categorization tags for announcement alerts.", today + timedelta(days=5), TaskStatus.PENDING),
        (staff["suraj"].id, "Prepare Phase 4 Interactive Architecture Review", "Create comprehensive walkthrough slides for Q4 engineering leadership demo.", today + timedelta(days=7), TaskStatus.PENDING),
        (staff["priya_ui"].id, "Design High-Fidelity UI for Onboarding Checklist", "Create accessible checklist cards with progress bars and smooth celebration micro-interactions.", today + timedelta(days=2), TaskStatus.COMPLETED),
        (staff["priya_ui"].id, "Design System Dark Mode Contrast Audit", "Verify WCAG AAA contrast compliance across all text muted and badge elements.", today + timedelta(days=6), TaskStatus.PENDING),
        (staff["rohit_qa"].id, "Build Automated Test Cases for Exit Workflow", "Verify resignation submission, approval notifications, and employee status update lifecycle.", today + timedelta(days=4), TaskStatus.PENDING),
        (staff["rohit_qa"].id, "Validate CSV Data Export Formats", "Ensure UTF-8 encoded CSV downloads work seamlessly in Microsoft Excel and Google Sheets.", today + timedelta(days=6), TaskStatus.PENDING),
        (staff["sneha_fin"].id, "Q3 TDS & Statutory PF Reconciliation", "Reconcile monthly employee deductions with bank transmission statements.", today + timedelta(days=8), TaskStatus.PENDING),
    ]
    for eid, title, desc, due_d, stat in tasks_data:
        db.add(Task(
            assigned_to=eid,
            title=title,
            description=desc,
            due_date=due_d,
            status=stat
        ))
    db.commit()

    # 16. Employee Feedback System (Module 26)
    feedback_data = [
        (staff["suraj"].id, "WorkSphere has transformed our day-to-day workflow. The ESS portal with shift schedules, leaves, and instant document downloads is exceptionally well designed!", 5.0, 3),
        (staff["priya_ui"].id, "Great design-first culture! The UI components feel crisp and the collaboration between product and engineering is top-tier.", 4.8, 5),
        (staff["rohit_qa"].id, "Continuous focus on software quality and automated testing tools makes daily releases painless.", 4.6, 7),
        (staff["sneha_fin"].id, "The automated payroll calculation with allowance and tax deductions saves days of manual accounting work every month.", 4.5, 10),
        (staff["vikram_sales"].id, "Smooth onboarding experience. Would love to see more CRM webhooks and export capabilities added.", 4.2, 12),
    ]
    for eid, msg, rating, days_ago in feedback_data:
        db.add(Feedback(
            employee_id=eid,
            message=msg,
            rating=rating,
            created_at=datetime.utcnow() - timedelta(days=days_ago)
        ))
    db.commit()

    db.close()
    print("Database successfully seeded for Phase 4 (Onboarding, Exit Management, Announcements, Tasks, Feedback, Profile & Integrations).")

if __name__ == "__main__":
    seed(force_reset=True)
