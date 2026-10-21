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

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime
    employee_id: Optional[int] = None
    full_name: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


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

    class Config:
        from_attributes = True


# --- Attendance ---
class AttendanceCheckIn(BaseModel):
    employee_id: Optional[int] = None  # if employee, auto-assigned from token

class AttendanceCheckOut(BaseModel):
    employee_id: Optional[int] = None

class AttendanceManualCreate(BaseModel):
    employee_id: int
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatus = AttendanceStatus.PRESENT

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

    class Config:
        from_attributes = True


# --- Leaves ---
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
    reason: str
    status: LeaveStatus
    created_at: datetime

    class Config:
        from_attributes = True


# --- Payroll ---
class PayrollCreate(BaseModel):
    employee_id: int
    month: str  # e.g., "October 2026"
    basic_salary: float
    deductions: float = 0.0
    bonus: float = 0.0

class PayrollOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    basic_salary: float
    deductions: float
    bonus: float
    net_salary: float
    month: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Notifications ---
class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Dashboard Analytics ---
class DepartmentStat(BaseModel):
    department: str
    count: int

class AttendanceSummary(BaseModel):
    present_today: int
    absent_today: int
    half_day_today: int
    total_today: int

class LeaveStats(BaseModel):
    pending: int
    approved: int
    rejected: int

class PayrollOverview(BaseModel):
    total_monthly_payroll: float
    total_bonuses: float
    total_deductions: float
    records_count: int

class DashboardData(BaseModel):
    total_employees: int
    active_employees: int
    attendance_summary: AttendanceSummary
    leave_stats: LeaveStats
    payroll_overview: PayrollOverview
    department_distribution: List[DepartmentStat]
    recent_attendances: List[AttendanceOut]
    recent_leaves: List[LeaveOut]
