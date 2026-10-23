from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from database import get_db
from models import (
    Leave, Employee, User, UserRole, LeaveStatus, LeaveType,
    LeavePolicy, LeaveBalance, Notification
)
from schemas import (
    LeaveCreate, LeaveStatusUpdate, LeaveOut,
    LeavePolicyOut, LeavePolicyCreate, LeaveBalanceOut
)
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/leaves", tags=["Leave Policies & Balances"])

DEFAULT_POLICIES = [
    (LeaveType.CASUAL, 12.0, "Casual leave for personal affairs and urgent events"),
    (LeaveType.SICK, 10.0, "Medical and sick leave for health recovery"),
    (LeaveType.PAID, 18.0, "Earned privilege and vacation leave"),
]

def _get_or_create_policies(db: Session) -> List[LeavePolicy]:
    policies = db.query(LeavePolicy).all()
    if not policies:
        for l_type, days, desc in DEFAULT_POLICIES:
            db.add(LeavePolicy(leave_type=l_type, total_days_allowed=days, description=desc))
        db.commit()
        policies = db.query(LeavePolicy).all()
    return policies

def ensure_employee_balances(emp_id: int, db: Session):
    policies = _get_or_create_policies(db)
    for pol in policies:
        balance = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == emp_id,
            LeaveBalance.leave_type == pol.leave_type
        ).first()

        if not balance:
            db.add(LeaveBalance(
                employee_id=emp_id,
                leave_type=pol.leave_type,
                total_days=pol.total_days_allowed,
                used_days=0.0,
                remaining_days=pol.total_days_allowed
            ))
    db.commit()

def _to_leave_out(l: Leave, emp: Optional[Employee] = None) -> LeaveOut:
    employee = emp or l.employee
    return LeaveOut(
        id=l.id,
        employee_id=l.employee_id,
        employee_name=employee.full_name if employee else None,
        department=employee.department if employee else None,
        leave_type=l.leave_type,
        start_date=l.start_date,
        end_date=l.end_date,
        days_count=float((l.end_date - l.start_date).days + 1),
        reason=l.reason,
        status=l.status,
        created_at=l.created_at
    )

@router.get("/policies", response_model=List[LeavePolicyOut])
def get_leave_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return _get_or_create_policies(db)

@router.post("/policies", response_model=LeavePolicyOut)
def update_or_create_policy(
    policy_in: LeavePolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.HR]))
):
    policy = db.query(LeavePolicy).filter(LeavePolicy.leave_type == policy_in.leave_type).first()
    if policy:
        policy.total_days_allowed = policy_in.total_days_allowed
        policy.description = policy_in.description
    else:
        policy = LeavePolicy(
            leave_type=policy_in.leave_type,
            total_days_allowed=policy_in.total_days_allowed,
            description=policy_in.description
        )
        db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy

@router.get("/balances", response_model=List[LeaveBalanceOut])
def get_leave_balances(
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_emp_id = None
    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        target_emp_id = current_user.employee.id
    else:
        target_emp_id = employee_id or (current_user.employee.id if current_user.employee else None)
        if not target_emp_id:
            first_emp = db.query(Employee).first()
            if first_emp:
                target_emp_id = first_emp.id

    if not target_emp_id:
        return []

    ensure_employee_balances(target_emp_id, db)
    balances = db.query(LeaveBalance).filter(LeaveBalance.employee_id == target_emp_id).all()
    emp = db.query(Employee).filter(Employee.id == target_emp_id).first()

    return [
        LeaveBalanceOut(
            id=b.id,
            employee_id=b.employee_id,
            employee_name=emp.full_name if emp else None,
            leave_type=b.leave_type,
            total_days=b.total_days,
            used_days=b.used_days,
            remaining_days=b.remaining_days
        )
        for b in balances
    ]

@router.get("", response_model=List[LeaveOut])
def get_leaves(
    status_filter: Optional[LeaveStatus] = Query(None, alias="status"),
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Leave).join(Employee)

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(Leave.employee_id == current_user.employee.id)
    elif employee_id:
        query = query.filter(Leave.employee_id == employee_id)

    if status_filter:
        query = query.filter(Leave.status == status_filter)

    leaves = query.order_by(Leave.created_at.desc()).all()
    return [_to_leave_out(l) for l in leaves]

@router.post("", response_model=LeaveOut, status_code=status.HTTP_201_CREATED)
def apply_leave(
    leave_in: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp_id = leave_in.employee_id
    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            raise HTTPException(status_code=400, detail="User has no linked employee profile")
        emp_id = current_user.employee.id
    elif not emp_id:
        emp_id = current_user.employee.id if current_user.employee else None
        if not emp_id:
            raise HTTPException(status_code=400, detail="Employee ID must be specified")

    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if leave_in.end_date < leave_in.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be earlier than start date")

    requested_days = float((leave_in.end_date - leave_in.start_date).days + 1)

    ensure_employee_balances(emp_id, db)
    bal = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == emp_id,
        LeaveBalance.leave_type == leave_in.leave_type
    ).first()

    if bal and bal.remaining_days < requested_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient {leave_in.leave_type.value} balance. Available: {bal.remaining_days:g} day(s), Requested: {requested_days:g} day(s)."
        )

    new_leave = Leave(
        employee_id=emp_id,
        leave_type=leave_in.leave_type,
        start_date=leave_in.start_date,
        end_date=leave_in.end_date,
        reason=leave_in.reason,
        status=LeaveStatus.PENDING,
        created_at=datetime.utcnow()
    )
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)

    hr_users = db.query(User).filter(User.role.in_([UserRole.HR, UserRole.ADMIN])).all()
    for hr_u in hr_users:
        db.add(Notification(
            user_id=hr_u.id,
            title=f"New Leave Request: {emp.full_name}",
            message=f"{emp.full_name} applied for {requested_days:g} days of {new_leave.leave_type.value} leave."
        ))
    db.commit()

    return _to_leave_out(new_leave, emp)

@router.put("/{leave_id}/status", response_model=LeaveOut)
def update_leave_status(
    leave_id: int,
    status_update: LeaveStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.HR]))
):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    old_status = leave.status
    new_status = status_update.status
    requested_days = float((leave.end_date - leave.start_date).days + 1)

    ensure_employee_balances(leave.employee_id, db)
    bal = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == leave.employee_id,
        LeaveBalance.leave_type == leave.leave_type
    ).first()

    if new_status == LeaveStatus.APPROVED and old_status != LeaveStatus.APPROVED:
        if bal:
            if bal.remaining_days < requested_days:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot approve: Employee only has {bal.remaining_days:g} day(s) left in {leave.leave_type.value} balance."
                )
            bal.used_days += requested_days
            bal.remaining_days = max(0.0, bal.remaining_days - requested_days)

    elif new_status != LeaveStatus.APPROVED and old_status == LeaveStatus.APPROVED:
        if bal:
            bal.used_days = max(0.0, bal.used_days - requested_days)
            bal.remaining_days = min(bal.total_days, bal.remaining_days + requested_days)

    leave.status = new_status
    db.commit()
    db.refresh(leave)

    if leave.employee and leave.employee.user:
        status_text = "APPROVED" if leave.status == LeaveStatus.APPROVED else "REJECTED"
        db.add(Notification(
            user_id=leave.employee.user.id,
            title=f"Leave Request {status_text}",
            message=f"Your {leave.leave_type.value} leave application ({leave.start_date} to {leave.end_date}) was {status_text.lower()}."
        ))
        db.commit()

    return _to_leave_out(leave)
