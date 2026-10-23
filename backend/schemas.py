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

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
