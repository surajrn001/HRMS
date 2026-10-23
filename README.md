# WorkSphere – HR Management System (HRMS)

**WorkSphere** is a modern, enterprise-grade HR Management System built using **FastAPI** (Python 3.13) and **React** (Vite).
Following the completion of Phase 1, **Phase 2** upgrades WorkSphere into a secure, role-driven enterprise platform featuring **Role-Based Access Control (RBAC)**, an **Employee Self-Service (ESS) Portal**, **Advanced Attendance Controls**, **Leave Policies & Balances**, **Enhanced Payroll Breakdown**, and **Admin Controls & User Governance**.

---

## 🏛️ System Architecture

```
WorkSphere HRMS (Phase 2 Upgrade)
├── backend/
│   ├── venv/                   # Python Virtual Environment
│   ├── database.py             # SQLite / SQLAlchemy Engine & Session
│   ├── models.py               # ORM Models (Users, Employees, Attendance, Leaves, LeavePolicy, LeaveBalance, Payroll, Notifications)
│   ├── schemas.py              # Pydantic Schemas for Validation & Serialization
│   ├── auth.py                 # JWT Authentication, is_active checks & RBAC Guards
│   ├── seed_data.py            # Phase 2 Database Seeding with Policies & Balances
│   ├── test_api.py             # Phase 2 End-to-End Test Suite (100% Passing)
│   ├── main.py                 # FastAPI Application with CORS & Phase 2 Routers
│   └── routers/
│       ├── auth.py             # /api/auth (Login, Register, Me)
│       ├── employees.py        # /api/employees (CRUD, Search, Filter, Auto-initialization)
│       ├── attendance.py       # /api/attendance (Check-In, Multi-punch Lock, Late Tracking, Overtime, Auto-Absent)
│       ├── leaves.py           # /api/leaves (Apply, Balances, Policies, Auto-Deductions, Over-usage Lock)
│       ├── payroll.py          # /api/payroll (Generate Breakdown, Summary, Payslip)
│       ├── dashboard.py        # /api/dashboard (Executive KPIs & ESS Personal Telemetry)
│       ├── notifications.py    # /api/notifications (Read, Mark All Read)
│       └── admin.py            # /api/admin (User Management, Role Assignments, Status Toggles, Security Stats)
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── NotificationsModal.jsx  # Real-time Notifications Drawer
    │   │   └── PayslipModal.jsx        # Corporate Salary Payslip Receipt (HRA, Spl, PF, Tax)
    │   ├── views/
    │   │   ├── LoginView.jsx           # JWT Auth, Register, 1-Click Role Logins (Admin, HR, Emp, Deactive)
    │   │   ├── DashboardView.jsx       # Employee Self-Service (ESS) Portal & Executive KPI Dashboard
    │   │   ├── EmployeesView.jsx       # Employee Directory, Profile Modal, Add/Edit
    │   │   ├── AttendanceView.jsx      # Multi-punch Lock, Late Badges, Overtime, Auto-mark Absent
    │   │   ├── LeavesView.jsx          # Leave Balances (CL/SL/PL), Policies, Live Validation Warnings
    │   │   ├── PayrollView.jsx         # Salary Breakdown Generator, Monthly Summary KPI Bar, Payslips
    │   │   └── AdminControlsView.jsx   # Module 13 User Governance, Role Assignment, Activation Switches
    │   ├── services/
    │   │   └── api.js                  # Centralized Fetch Client with Bearer Token & Phase 2 APIs
    │   ├── App.jsx                     # Shell Layout, RBAC Route Protection, Role Indicators
    │   ├── App.css                     # Custom Layouts & Components
    │   └── index.css                   # Enterprise CSS Design System (Badges, Switch Toggles, Progress Bars)
    └── vite.config.js                  # Vite Config with Backend Proxy
```

---

## 🚀 Phase 2 Features & Enhancements

### Module 8: Role-Based Access Control (RBAC) – FastAPI
- **Users Table Update**:
  - `role` (`EMPLOYEE` / `HR` / `ADMIN`)
  - `is_active` (`True` / `False`) for instant account lockouts
- **Security & Authorization**:
  - Embedded role in JWT token payload (`sub`, `role`, `user_id`).
  - Strict middleware/dependency `require_roles([allowed_roles])` and `is_active` check on every protected API.
  - Ownership validation: Employees cannot inspect other personnel records, punches, or payslips.
  - Deactivated accounts are blocked with `HTTP 403 Forbidden`.

### Module 9: Employee Self-Service (ESS) Portal
- **Dedicated Employee View**: When logging in as `EMPLOYEE` (e.g. Suraj), the dashboard dynamically morphs into an Employee Self-Service Portal.
- **Personal Details & Identity**: Profile card showcasing Employee ID, Designation, Department, Date of Joining, and Account Status.
- **Today's Shift & Punches**: Live interactive punch widget with digital clock, shift hours (09:30 AM – 06:30 PM), on-time vs late pill tags, and total clocked time.
- **Leave Entitlement Cards**: Visual cards for Casual Leave, Sick Leave, and Paid Leave with used/remaining days and animated progress bars.
- **Quick Payslip Access**: One-click launcher to inspect and print latest monthly payslip with earnings and deductions breakdown.

### Module 10: Advanced Attendance Controls
- **Duplicate Punch Prevention**: Prevents multiple check-ins per day with descriptive HTTP 400 Bad Request if already clocked in or shift completed.
- **Late Entry Tracking**: Standard shift starts at 09:30 AM IST. Punches past 09:30 AM automatically compute `late_minutes`, set `is_late = True`, and render an amber pill indicator with exact late duration.
- **Overtime Calculation**: Working hours beyond 8.0 hours automatically calculate `overtime_hours` with purple badge tags.
- **Auto-Mark Absent Utility**: Dedicated endpoint (`/api/attendance/auto-mark-absent`) and UI modal for HR/Admin to automatically mark absent for active staff who missed check-in on any workday.

### Module 11: Leave Policies & Balances
- **New Tables**:
  - `leave_policies`: `id`, `leave_type`, `total_days_allowed`, `description`.
  - `leave_balances`: `id`, `employee_id`, `leave_type`, `total_days`, `used_days`, `remaining_days`.
- **Over-Usage Prevention**: Live duration calculator validates requested days against remaining balance. If requested duration exceeds balance, submission is disabled with a clear warning alert.
- **Automated Deduction**: When HR/Admin approves a leave request, the exact requested duration is automatically deducted from `leave_balances`.

### Module 12: Payroll Enhancements
- **Granular Salary Breakdown**:
  - **Earnings**: Basic Salary (50%), House Rent Allowance (HRA, 30%), Special Allowance (20%), Performance Bonus.
  - **Deductions**: Employee Provident Fund (EPF, 12%), Professional Tax (PT, ₹200), Income Tax (TDS).
  - **Net Take-Home**: `(Basic + HRA + Special + Bonus) - Total Deductions`.
- **Monthly Payroll Summary**: Header KPI bar displaying Total Net Disbursed, Total Gross Earnings, Total Statutory Deductions, and Total Allowances.
- **Detailed Corporate Payslip (`PayslipModal.jsx`)**: Complete Indian Form 16 payslip layout with employee ID, PF UAN, bank details, two-column earnings vs deductions tables, and print/PDF support.

### Module 13: Admin Controls & User Management
- **Dedicated Admin Console (`AdminControlsView.jsx`)**: Exclusive navigation view for `ADMIN` role.
- **User Governance**: Create new accounts, change enterprise roles (`EMPLOYEE` / `HR` / `ADMIN`), reset user passwords, and delete accounts.
- **Instant Status Toggle**: Active / Deactivated toggle switch that immediately revokes or restores login privileges.
- **System Security Metrics**: Real-time counter of total system accounts, active users, deactivated users, and role distribution.

---

## 🔑 Demo Login Credentials (Phase 2)

| Role | Username | Password | Full Name & Title | Access Scope |
|---|---|---|---|---|
| **System Admin** | `admin` | `admin123` | Rajesh Sharma (Director of Engineering) | Full System Access, Admin Controls, User Management, Analytics |
| **HR Operations** | `neha_hr` | `hr123` | Neha Kulkarni (Manager - People Operations) | Staff Directory, Leave Approvals, Shift Audits, Payroll Runs |
| **Employee (ESS)** | `suraj` | `emp123` | Suraj (Senior Full-Stack Engineer) | Self-Service Portal, Check-In/Out, My Leaves & Balances, My Payslips |
| **Deactivated Account** | `kunal_contractor` | `emp123` | Kunal Verma (Contractor) | Blocked with 403 Forbidden (Tests Deactivation Engine) |

---

## 💻 How to Run Locally

### 1. Backend (FastAPI)
```bash
cd backend
# Activate Python Virtual Environment
venv\Scripts\activate   # Windows
# Run server with auto-reload
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger API Documentation: `http://127.0.0.1:8000/docs`

### 2. Frontend (React + Vite)
```bash
cd frontend
# Start Vite development server
npm run dev
```
WorkSphere HRMS Web Application: `http://localhost:5173`

### 3. Run Automated Test Suite
```bash
backend\venv\Scripts\python backend\test_api.py
```
*(Tests RBAC, Deactivation locks, Duplicate Punch Locks, Late Entry tags, Over-Usage prevention, Balances, and Payroll Breakdown)*
