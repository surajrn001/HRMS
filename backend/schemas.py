from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from models import UserRole, EmployeeStatus, AttendanceStatus, LeaveType, LeaveStatus

# --- Authentication & Users ---
class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: UserRole = UserRole.EMPLOYEE

class UserCreate(UserBase):
    password: str = Field(..., min_length=4)
    employee_id: Optional[int] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserRoleUpdate(BaseModel):
    role: UserRole

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=4)

class UserOut(UserBase):
    id: int
    is_active: bool = True
    created_at: datetime
    employee_id: Optional[int] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None


# --- Employees ---
class EmployeeBase(BaseModel):
    full_name: str
    designation: str
    department: str
    joining_date: date
    salary: float = 0.0
    status: EmployeeStatus = EmployeeStatus.ACTIVE

class EmployeeCreate(EmployeeBase):
    email: EmailStr
    username: Optional[str] = None
    password: Optional[str] = "password123"
    role: UserRole = UserRole.EMPLOYEE

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    joining_date: Optional[date] = None
    salary: Optional[float] = None
    status: Optional[EmployeeStatus] = None

class EmployeeOut(EmployeeBase):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    current_shift: Optional[str] = None
    shift_id: Optional[int] = None
    shift_timings: Optional[str] = None
    avg_rating: Optional[float] = None
    attendance_today: Optional[str] = None

    class Config:
        from_attributes = True


# --- Attendance ---
class AttendanceCheckIn(BaseModel):
    employee_id: Optional[int] = None

class AttendanceCheckOut(BaseModel):
    employee_id: Optional[int] = None

class AttendanceManualCreate(BaseModel):
    employee_id: int
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatus = AttendanceStatus.PRESENT
    is_late: Optional[bool] = False
    late_minutes: Optional[int] = 0
    overtime_hours: Optional[float] = 0.0

class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    department: Optional[str] = None
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    working_hours: float
    status: AttendanceStatus
    is_late: bool = False
    late_minutes: int = 0
    overtime_hours: float = 0.0

    class Config:
        from_attributes = True


# --- Leaves & Policies ---
class LeaveCreate(BaseModel):
    employee_id: Optional[int] = None
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str

class LeaveStatusUpdate(BaseModel):
    status: LeaveStatus  # APPROVED or REJECTED

class LeaveOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    department: Optional[str] = None
    leave_type: LeaveType
    start_date: date
    end_date: date
    days_count: Optional[float] = None
    reason: str
    status: LeaveStatus
    created_at: datetime

    class Config:
        from_attributes = True

class LeavePolicyBase(BaseModel):
    leave_type: LeaveType
    total_days_allowed: float
    description: Optional[str] = None

class LeavePolicyCreate(LeavePolicyBase):
    pass

class LeavePolicyOut(LeavePolicyBase):
    id: int

    class Config:
        from_attributes = True

class LeaveBalanceOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    leave_type: LeaveType
    total_days: float
    used_days: float
    remaining_days: float

    class Config:
        from_attributes = True


# --- Payroll ---
class PayrollCreate(BaseModel):
    employee_id: int
    month: str  # e.g., "October 2026"
    basic_salary: float
    hra: Optional[float] = 0.0
    special_allowance: Optional[float] = 0.0
    bonus: Optional[float] = 0.0
    pf_deduction: Optional[float] = 0.0
    tax_deduction: Optional[float] = 0.0
    deductions: Optional[float] = 0.0

class PayrollOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    basic_salary: float
    hra: float = 0.0
    special_allowance: float = 0.0
    bonus: float = 0.0
    pf_deduction: float = 0.0
    tax_deduction: float = 0.0
    deductions: float = 0.0
    net_salary: float
    month: str
    created_at: datetime

    class Config:
        from_attributes = True

class PayrollSummaryOut(BaseModel):
    month: str
    total_employees: int
    total_gross_disbursed: float
    total_basic: float
    total_allowances: float
    total_deductions: float
    total_net_disbursed: float


# --- Notifications ---
class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str
    category: Optional[str] = "SYSTEM"

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    category: str = "SYSTEM"
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Shifts & Employee Shifts (Module 14) ---
class ShiftBase(BaseModel):
    name: str
    start_time: str
    end_time: str
    description: Optional[str] = None

class ShiftCreate(ShiftBase):
    pass

class ShiftOut(ShiftBase):
    id: int

    class Config:
        from_attributes = True

class EmployeeShiftAssign(BaseModel):
    employee_id: int
    shift_id: int

class EmployeeShiftOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    department: Optional[str] = None
    shift_id: int
    shift_name: str
    start_time: str
    end_time: str
    assigned_date: date
    is_active: bool

    class Config:
        from_attributes = True


# --- Document Management System (Module 16) ---
class DocumentOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    title: str
    document_type: str
    file_name: str
    file_url: str
    file_size: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


# --- Performance Management System (Module 17) ---
class PerformanceCreate(BaseModel):
    employee_id: int
    review_period: str
    rating: float
    feedback: str
    reviewer_name: Optional[str] = None
    goals: Optional[str] = None

class PerformanceUpdate(BaseModel):
    rating: Optional[float] = None
    feedback: Optional[str] = None
    goals: Optional[str] = None

class PerformanceOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    department: Optional[str] = None
    review_period: str
    rating: float
    feedback: str
    reviewer_name: Optional[str] = None
    goals: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PerformanceStatsOut(BaseModel):
    total_reviews: int
    average_rating: float
    rating_distribution: dict[str, int]


# --- Leave Calendar & Conflict (Module 15) ---
class LeaveCalendarEvent(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    department: str
    leave_type: LeaveType
    start_date: date
    end_date: date
    days_count: float
    status: LeaveStatus

class LeaveConflictCheck(BaseModel):
    employee_id: int
    start_date: date
    end_date: date

class LeaveConflictResult(BaseModel):
    has_conflict: bool
    conflict_count: int
    conflicts: list[LeaveCalendarEvent]
    message: str


# --- Advanced Analytics & Reports (Module 18) ---
class AttendanceTrendPoint(BaseModel):
    date: str
    present: int
    late: int
    absent: int
    attendance_rate: float

class LeaveTrendPoint(BaseModel):
    month: str
    approved: int
    pending: int
    rejected: int

class DepartmentReport(BaseModel):
    department: str
    total_employees: int
    present_today: int
    on_leave_today: int
    avg_rating: float
    monthly_payroll: float

class AnalyticsOverviewOut(BaseModel):
    total_employees: int
    attendance_rate_month: float
    avg_performance_rating: float
    active_leaves_today: int
    total_monthly_payroll: float
    attendance_trends: list[AttendanceTrendPoint]
    leave_trends: list[LeaveTrendPoint]
    department_reports: list[DepartmentReport]
