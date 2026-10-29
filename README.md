# WorkSphere – HR Management System (HRMS)

**WorkSphere** is a modern, enterprise-grade HR Management System built using **FastAPI** (Python 3.13) and **React** (Vite).
Following the completion of Phases 1, 2, and 3, **Phase 4** enhances WorkSphere into an interactive, connected, and scalable platform with **Employee Onboarding System**, **Resignation & Exit Management**, **Internal Company Announcements**, **Internal Task Assignment & Tracking**, **Third-Party Integrations (RFC 5545 iCalendar & Google Calendar Sync, Email Notifications, CSV Exports)**, **Employee Sentiment & Feedback System**, and **Personal Profile & Settings Management**.

---

## 🏛️ System Architecture

```
WorkSphere HRMS (Phase 4 Enterprise Upgrade)
├── backend/
│   ├── venv/                   # Python Virtual Environment
│   ├── database.py             # SQLite / SQLAlchemy Engine & Session
│   ├── models.py               # ORM Models (Users, Employees, Attendance, Leaves, Payroll, Notifications, Shifts, Documents, Performance, Onboarding, Resignations, Announcements, Tasks, Feedback, UserSettings)
│   ├── schemas.py              # Pydantic Schemas for Validation & Serialization
│   ├── auth.py                 # JWT Authentication, is_active checks & RBAC Guards
│   ├── seed_data.py            # Phase 4 Database Seeding (Onboarding, Resignations, Announcements, Tasks, Feedback, Profiles, Settings)
│   ├── test_api.py             # Comprehensive 27-Module Test Suite (100% Passing)
│   ├── main.py                 # FastAPI Application with CORS & Phase 4 Routers (v4.0.0)
│   ├── uploads/                # Encrypted Local Vault for Verified Employee Documents
│   └── routers/
│       ├── auth.py             # /api/auth (Login, Register, Me)
│       ├── employees.py        # /api/employees (CRUD, Search, Multi-Filters, Shift/Rating/Attendance Badges)
│       ├── attendance.py       # /api/attendance (Shift-aware Check-In, Late Tracking, Overtime, Auto-Mark)
│       ├── leaves.py           # /api/leaves (Apply, Balances, Policies, Calendar, Availability, Conflict Engine)
│       ├── shifts.py           # /api/shifts (CRUD Shifts, Shift Assignments, My-Shift)
│       ├── documents.py        # /api/documents (Upload, Secure Download, Category Filters, RBAC)
│       ├── performance.py      # /api/performance (Reviews, Star Ratings, Goals, HR Stats)
│       ├── analytics.py        # /api/analytics (Workforce Overview, Daily Attendance Trends, CSV Exports)
│       ├── payroll.py          # /api/payroll (Generate Breakdown, Summary, Payslip)
│       ├── dashboard.py        # /api/dashboard (Executive KPIs & ESS Personal Telemetry)
│       ├── notifications.py    # /api/notifications (Categorized Alerts, Mark Read, Clear/Delete)
│       ├── admin.py            # /api/admin (User Management, Role Assignments, Status Toggles, Security Stats)
│       ├── onboarding.py       # /api/onboarding (Checklists, Progress Metrics, Defaults, Task Status) [Module 21]
│       ├── resignations.py     # /api/resignations (Submit, Approve/Reject, Notice Periods, Timeline) [Module 22]
│       ├── announcements.py    # /api/announcements (Bulletin Board, Broadcast Notifications, Search) [Module 23]
│       ├── tasks.py            # /api/tasks (Internal Task Assignment, Dashboard Stats, Status Toggles) [Module 24]
│       ├── integrations.py     # /api/integrations (RFC 5545 .ics Feed, Google Calendar Sync, Email Logs, CSV Exports) [Module 25]
│       ├── feedback.py         # /api/feedback (5-Star Ratings, Sentiment Dashboard, HR Summary) [Module 26]
│       └── profile.py          # /api/profile (Personal Details, Password Change, Notification Preferences) [Module 27]
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── NotificationsModal.jsx  # Smart Alerts Drawer with 8 Category Filters & Clear All
    │   │   └── PayslipModal.jsx        # Indian Form 16 Salary Payslip Receipt (HRA, Spl, PF, Tax)
    │   ├── views/
    │   │   ├── LoginView.jsx           # JWT Auth, Register, 1-Click Role Logins
    │   │   ├── DashboardView.jsx       # Employee Self-Service (ESS) Portal & Executive KPI Dashboard
    │   │   ├── EmployeesView.jsx       # Advanced Search & Multi-Filters (Shift, Rating, Attendance, Role)
    │   │   ├── AttendanceView.jsx      # Shift Schedule Display, Shift Roster Modal, Late Entry Alerts
    │   │   ├── LeavesView.jsx          # Leave Balances, Team Leave Calendar, Team Availability Dashboard & Conflict Detection
    │   │   ├── DocumentsView.jsx       # Module 16 Secure Document Vault & File Upload Modal
    │   │   ├── PerformanceView.jsx     # Module 17 Performance Reviews, Star Ratings, Stats & Goal Tracking
    │   │   ├── AnalyticsView.jsx       # Module 18 Visual Trend Charts, Department Reports & CSV Export
    │   │   ├── PayrollView.jsx         # Salary Breakdown Generator, Monthly Summary KPI Bar, Payslips
    │   │   ├── AdminControlsView.jsx   # Module 13 User Governance, Role Assignment, Activation Switches
    │   │   ├── OnboardingView.jsx      # Module 21 Onboarding Checklist & New Hire Progress Hub
    │   │   ├── ExitManagementView.jsx  # Module 22 Resignation Workflow & Separation Tracker
    │   │   ├── AnnouncementsView.jsx   # Module 23 Company Announcements Noticeboard & Full Detail Modal
    │   │   ├── TasksView.jsx           # Module 24 Internal Task Dashboard, Metrics, & Assignment Modal
    │   │   ├── IntegrationsView.jsx    # Module 25 CSV Data Export Center, iCal & Google Calendar Sync, Email Service
    │   │   ├── FeedbackView.jsx        # Module 26 5-Star Sentiment Rating Picker & Satisfaction Distribution
    │   │   └── ProfileSettingsView.jsx # Module 27 Profile Details, Password Change, Notification Preferences
    │   ├── services/
    │   │   └── api.js                  # Centralized Fetch Client with Bearer Token & All Phase 1-4 APIs
    │   ├── App.jsx                     # Shell Layout, Dynamic Role Navigation, Profile Header Quick-Action
    │   ├── App.css                     # Custom Layouts & Components
    │   └── index.css                   # Enterprise CSS Design System (Badges, Switch Toggles, Progress Bars)
    └── vite.config.js                  # Vite Config with Backend Proxy
```

---

## 📸 System Showcase & Visual Proof (All Modules)

| Module & Feature | Screenshot |
|---|---|
| **Authentication & Role Portals** | ![Login Portal](Screenshots/login.png) |
| **Executive & Employee Dashboard** | ![Dashboard Overview](Screenshots/dashboard.png) |
| **Employee Directory & Multi-Filters** | ![Employee Directory](Screenshots/employees.png) |
| **Attendance & Shift Management** | ![Attendance & Shifts](Screenshots/attendance.png) |
| **Leave Management & Team Calendar** | ![Leave Management](Screenshots/leaves.png) |
| **Payroll & Salary Generator** | ![Payroll](Screenshots/payroll.png) |
| **Performance Reviews & Ratings** | ![Performance Reviews](Screenshots/performance.png) |
| **Secure Document Vault** | ![Document Vault](Screenshots/documents.png) |
| **Workforce Analytics & Trends** | ![Workforce Analytics](Screenshots/analytics.png) |
| **Admin Controls & Governance** | ![Admin Controls](Screenshots/admin.png) |
| **Module 21: Onboarding Checklist** | ![Onboarding System](Screenshots/onboarding.png) |
| **Module 22: Resignation & Exit Workflow** | ![Exit Management](Screenshots/exit.png) |
| **Module 23: Company Announcements** | ![Announcements](Screenshots/announcements.png) |
| **Module 24: Task Assignment & Tracking** | ![Task Tracking](Screenshots/tasks.png) |
| **Module 25: Third-Party Integrations** | ![System Integrations](Screenshots/integrations.png) |
| **Module 26: Employee Feedback & Sentiment** | ![Feedback System](Screenshots/feedback.png) |
| **Module 27: Profile & Settings** | ![Profile Settings](Screenshots/settings.png) |

---

## 🚀 Complete 27-Module Feature Breakdown (Phases 1–4)

### Phase 1: Core Foundation & HR Workflows (Modules 1–7)
- **Module 1**: Modern responsive SPA foundation with minimalist design system.
- **Module 2**: Full CRUD Employee Management with Indian rupee salary formatting.
- **Module 3**: Daily Attendance Punch system with check-in/out logging.
- **Module 4**: Leave Application and Approval workflow.
- **Module 5**: Automated Monthly Payroll generator with net salary calculation.
- **Module 6**: Real-time Executive KPI dashboard.
- **Module 7**: System notifications drawer.

---

### Phase 2: Role-Based Access Control & Advanced HR Workflows (Modules 8–13)
- **Module 8: Role-Based Access Control (RBAC)**:
  - User roles (`EMPLOYEE`, `HR`, `ADMIN`) embedded in JWT tokens.
  - Strict endpoint authorization via `require_roles([allowed_roles])`.
  - Immediate login rejection (`403 Forbidden`) for deactivated accounts.
- **Module 9: Employee Self-Service (ESS) Portal**:
  - Personalized employee view for profile details, punch status, leave balances, and payslips.
- **Module 10: Advanced Attendance Controls**:
  - Duplicate check-in prevention, late check-in detection, overtime tracking, and auto-absence engine.
- **Module 11: Leave Policies & Balances**:
  - Separate policy allowances for Casual (12d), Sick (10d), and Paid (18d) leave.
  - Live over-usage validation preventing applications exceeding remaining balance.
- **Module 12: Granular Payroll Breakdown**:
  - Basic (50%), HRA (30%), Special Allowance (20%), PF (12%), Professional Tax, and Income Tax deductions.
  - Detailed corporate payslip receipt with print support.
- **Module 13: Admin Controls & User Governance**:
  - Admin panel for creating accounts, switching roles, resetting passwords, and toggling user activation.

---

### Phase 3: Automation, Insights & Smart HR Features (Modules 14–20)

#### Module 14: Automated Attendance & Shift Management
- **Shift Definitions**: Pre-configured shifts including Morning Shift (08:00 – 16:30), General Shift (09:30 – 18:30), Evening Shift (14:00 – 22:30), and Night Shift (22:00 – 06:30).
- **Shift Assignments**: HR and Admin can assign team members to specific shift rosters via `/api/shifts/assign` and the Shift Rosters UI modal.
- **Shift-Aware Late Detection**: Attendance punch evaluations dynamically assess punctuality against the employee's active shift start time (with 15-minute grace period).
- **Employee Shift Schedule View**: The digital clock banner displays the employee's assigned shift name and working hours in real time.

#### Module 15: Leave Calendar & Team View
- **Team Leave Calendar**: Visual schedule grid mapping upcoming employee out-of-office dates, filterable by department.
- **Team Availability Dashboard**: Real-time operational roster displaying who is Available vs On Leave today across all corporate departments.
- **Leave Conflict Engine**: Automated overlap detection (`/api/leaves/conflicts`) alerts employees if colleagues in their department already have scheduled leaves during the requested dates.

#### Module 16: Document Management System
- **Secure File Storage**: Local encrypted vault (`backend/uploads/`) for verified employee documents.
- **Document Categories**: Identity Documents (Aadhaar, Passport), Offer Letters, Academic Degrees, Professional Certifications, and Tax Forms.
- **Role-Isolated Access**: Employees securely view and download only their verified personal documents; HR and Admin can audit and manage company-wide files.
- **Direct File Downloads**: Secure streaming endpoint (`/api/documents/{id}/download`) enforcing JWT ownership checks.

#### Module 17: Performance Management System
- **Appraisal Records**: Structured performance evaluations with review periods (e.g. Q1, Q2, Q3, Annual), 1.0 to 5.0 star ratings, qualitative manager feedback, and forward-looking milestones.
- **Company Rating Analytics**: High-level statistics on average company rating, total reviews filed, top performer distribution (4.5★+), and solid contributor ratios.
- **Employee Review History**: Employees can view their historical manager appraisals and career growth milestones.

#### Module 18: Advanced Analytics & Reports
- **Attendance Trend Patterns**: Interactive visual bar charts illustrating daily punctuality, on-time presence rates, and late check-in volumes over 7, 14, or 30 days.
- **Department Operational Metrics**: Headcount allocations, daily present counts, active leaves, average performance index, and monthly payroll disbursement per department.
- **CSV Data Exports**: One-click direct downloads for Department Analytics CSV, Attendance Audit Log CSV, and Leave History CSV.

#### Module 19: Smart Notifications & Alerts
- **Categorized Alert Engine**: Notifications are systematically classified into `ATTENDANCE`, `LEAVE`, `PAYROLL`, `SHIFT`, `PERFORMANCE`, `DOCUMENT`, and `SYSTEM`.
- **Automated Event Triggers**: Instant alerts generated on late entry, shift reassignment, payslip credit, appraisal publishing, and leave status updates.
- **Filterable Notification Drawer**: Filter alerts by category pills, mark all as read, dismiss individual alerts, or clear all.

#### Module 20: Employee Search & Filters (Advanced)
- **Multi-Faceted Search**: Instant search by Name, Department, Designation, or Email.
- **Facet Dropdowns**:
  - Filter by User Role (`ADMIN`, `HR`, `EMPLOYEE`)
  - Filter by Assigned Shift (`General Shift`, `Morning Shift`, `Evening Shift`, `Night Shift`)
  - Filter by Today's Attendance (`PRESENT`, `LATE ENTRY`, `ABSENT`, `NOT YET`)
  - Filter by Performance Rating (`4.5★ & Above`, `4.0★ & Above`, `3.5★ & Above`)
  - Filter by Account Status (`ACTIVE`, `INACTIVE`)
- **Rich Table Indicators**: Table rows showcase assigned shift badges, live attendance pill tags, and star ratings alongside compensation and status.

---

### Phase 4: Employee Experience & System Integrations (Modules 21–27)

#### Module 21: Employee Onboarding System
- **Structured Onboarding Checklists**: Automatically assigns standard orientation milestones (e.g., complete profile, submit tax forms, setup email, review company handbook) to new joiners.
- **Progress Tracking & Visual Gauges**: Real-time completion progress bar and fraction stats (e.g., 75% complete).
- **Interactive Checklists**: Employees can mark tasks as completed in real time.
- **HR Onboarding Hub**: HR and Admin view company-wide onboarding progress across all recent hires.

#### Module 22: Resignation & Exit Management
- **Self-Service Resignation Submission**: Employees can submit formal resignation requests with reason and notice period (in days).
- **Multi-Role Workflow Approval**: HR and Admin can review, approve, or reject resignation requests.
- **Separation & Exit Tracker**: Clear status badges (`PENDING`, `APPROVED`, `REJECTED`) and handover details.

#### Module 23: Internal Company Announcements
- **Organization Noticeboard**: Broadcast important company-wide updates, events, policy changes, and celebrations.
- **Announcement Detail Modals**: Read full announcements with publication timestamps and author details.
- **Real-Time Broadcast Notifications**: New announcements automatically dispatch high-priority system alerts.

#### Module 24: Internal Task Assignment & Tracking
- **Task Management Engine**: Assign internal deliverables with title, description, priority (`LOW`, `MEDIUM`, `HIGH`), and due dates.
- **Status Progression**: Employees can toggle task completion status (`PENDING` ↔ `COMPLETED`).
- **Personal Task Metrics**: Metric cards displaying total assigned, completed, pending tasks, and completion percentage.

#### Module 25: Third-Party Integrations & Data Exchange
- **RFC 5545 iCalendar (`.ics`) Feed**: Standardized calendar feed integration allowing employees to subscribe to company shifts and leaves in Outlook/Apple Calendar.
- **1-Click Google Calendar Sync**: Instant URL generator for adding shifts and holidays directly to Google Calendar.
- **Email Notification Simulator & Audit Log**: System audit logs recording email dispatches with delivery status and timestamp.
- **Centralized CSV Export Center**: 1-click exports for Employees, Attendance, Payroll, Leaves, Onboarding, and Resignation datasets.

#### Module 26: Employee Sentiment & Feedback System
- **5-Star Interactive Rating**: Intuitive visual star picker for anonymous or identified employee feedback.
- **Sentiment & Ratings Analytics**: HR view of overall organization satisfaction score and rating distributions.
- **Continuous Improvement Loop**: Helps management gauge team morale and address operational roadblocks.

#### Module 27: Personal Profile & Settings Management
- **Personal Details Management**: Update contact phone number, residential address, emergency contact, and biographical statement.
- **Security & Password Management**: Self-service password changes with old password verification and hashing.
- **User Experience Preferences**: Toggle email notification preferences, desktop push alerts, and theme preferences.

---

## 🔑 Default Seeded Accounts & Credentials

| Role | Username | Password | Full Name | Department | Assigned Shift |
|---|---|---|---|---|---|
| **Admin** | `admin` | `admin123` | Rajesh Sharma | Executive Management | General Shift (09:30 - 18:30) |
| **HR Manager** | `neha_hr` | `hr123` | Neha Kulkarni | Human Resources | General Shift (09:30 - 18:30) |
| **Employee** | `suraj` | `emp123` | Suraj | Engineering | General Shift (09:30 - 18:30) |
| **Employee** | `priya_ui` | `emp123` | Priya Nair | Design & UX | General Shift (09:30 - 18:30) |
| **Employee** | `rohit_qa` | `emp123` | Rohit Deshmukh | Engineering | Morning Shift (08:00 - 16:30) |
| **Employee** | `sneha_fin` | `emp123` | Sneha Iyer | Finance & Accounts | General Shift (09:30 - 18:30) |
| **Employee** | `vikram_sales` | `emp123` | Vikram Malhotra | Sales & Growth | Evening Shift (14:00 - 22:30) |
| **Deactivated** | `kunal_contractor` | `emp123` | Kunal Verma | Engineering | Inactive (403 Blocked) |

---

## 🛠️ Verification & Test Execution

Run the end-to-end automated test suite to verify all Phase 1, Phase 2, and Phase 3 modules:

```powershell
cd backend
.\venv\Scripts\python test_api.py
```

Expected output:
```
=== Testing WorkSphere Phase 4 (Employee Experience & System Integrations) ===
 [OK] Root health check & Phase 4 API version 4.0.0 verified
 [OK] Admin, HR, and Employee JWT authentication tokens verified
 [OK] Shift Management: Retrieved 4 shifts (General: 09:30 - 18:30)
 [OK] Employee Shift View: Active shift 'General Shift' confirmed for Suraj
 [OK] Shift Assignments: HR retrieved 8 active assignments
 [OK] Team Leave Calendar: 5 calendar events loaded
 [OK] Leave Conflict Engine: Evaluated schedule (has_conflict=True)
 [OK] Team Availability Dashboard: 7 active available team members
 [OK] Document Vault: Employee retrieved 3 verified personal documents
 [OK] Secure Document Download: Downloaded document 3 successfully
 [OK] Document Upload: Successfully uploaded test document (ID=7)
 [OK] Document Deletion: Cleaned up temporary test document
 [OK] Performance Reviews: Employee retrieved 2 reviews (Latest: 4.9* in Q2 2026)
 [OK] Performance Analytics: Average rating 4.62 across 6 reviews
 [OK] Analytics Overview: 7 daily trend points, 6 department reports
 [OK] Reports Export: Successfully exported department analytics CSV
 [OK] Smart Notifications: Category filter 'SYSTEM' returned 2 items
 [OK] Smart Notifications: Category filter 'SHIFT' returned 1 items
 [OK] Advanced Search: Found employee by name 'Suraj'
 [OK] Shift Filter: Filtered 5 employees in General Shift
 [OK] Performance Filter: Found 4 employees with >= 4.5 avg rating
 [OK] Onboarding: Employee retrieved 4 assigned onboarding checklist tasks
 [OK] Onboarding Progress: 3/4 completed (75.0%)
 [OK] Onboarding Overview: HR reviewed onboarding progress for 3 new team members
 [OK] Onboarding Task Toggle: Marked task 1 as COMPLETED
 [OK] Exit Management: HR retrieved 2 exit records (Found approved exit for Kunal)
 [OK] Resignation Submission: Successfully submitted resignation request ID=3
 [OK] Resignation Approval: HR approved exit workflow for ID=3
 [OK] Internal Announcements: Employee loaded 5 organization notices
 [OK] Announcement Broadcast: HR posted live announcement (ID=6)
 [OK] Internal Tasks: Employee retrieved 4 assigned work items
 [OK] Task Stats: 2/4 tasks completed (Rate: 50.0%)
 [OK] Task Assignment: HR assigned new task ID=10
 [OK] Task Status Update: Employee marked task ID=10 as COMPLETED
 [OK] Email Integration: Successfully dispatched test notification email
 [OK] Email Audit Logs: Retrieved 1 dispatch logs
 [OK] Calendar Integration: RFC 5545 .ics iCalendar file generated and verified
 [OK] Calendar Integration: 1-click Google Calendar URL generation verified
 [OK] Report Exports: Successfully exported all 6 CSV datasets (employees, attendance, payroll, leaves, onboarding, resignations)
 [OK] Employee Feedback: Employee retrieved 2 submitted feedback items
 [OK] Feedback Submission: Recorded 5.0* employee feedback
 [OK] Feedback Analytics: 7 total reviews with average satisfaction 4.73*
 [OK] Profile Management: Loaded profile for 'Suraj' (Senior Full-Stack Engineer)
 [OK] Profile Update: Updated employee bio successfully
 [OK] User Preferences: Updated notification settings successfully
 [OK] Password Security: Verified current password and updated to new hash
 [OK] Password Revert: Restored test password to original

==========================================================================
 SUCCESS: All 27 WorkSphere Modules (Phase 1, 2, 3 & 4) 100% VERIFIED!
==========================================================================
```

---

## 💻 Running Locally

### Backend (FastAPI)
```powershell
cd backend
.\venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Frontend (React + Vite)
```powershell
cd frontend
npm run dev
```
Client URL: [http://localhost:5173](http://localhost:5173)
