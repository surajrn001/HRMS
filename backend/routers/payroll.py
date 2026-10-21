from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import Payroll, Employee, User, UserRole, Notification
from schemas import PayrollCreate, PayrollOut
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/payroll", tags=["Payroll Management"])

@router.get("", response_model=List[PayrollOut])
def get_payroll_list(
    month: Optional[str] = Query(None),
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Payroll).join(Employee)

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(Payroll.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(Payroll.employee_id == employee_id)

    if month:
        query = query.filter(Payroll.month == month)

    payrolls = query.order_by(Payroll.created_at.desc()).all()

    result = []
    for p in payrolls:
        result.append(PayrollOut(
            id=p.id,
            employee_id=p.employee_id,
            employee_name=p.employee.full_name if p.employee else None,
            department=p.employee.department if p.employee else None,
            designation=p.employee.designation if p.employee else None,
            basic_salary=p.basic_salary,
            deductions=p.deductions,
            bonus=p.bonus,
            net_salary=p.net_salary,
            month=p.month,
            created_at=p.created_at
        ))
    return result

@router.get("/{payroll_id}", response_model=PayrollOut)
def get_payroll_item(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = db.query(Payroll).join(Employee).filter(Payroll.id == payroll_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee or p.employee_id != current_user.employee.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this payslip")

    return PayrollOut(
        id=p.id,
        employee_id=p.employee_id,
        employee_name=p.employee.full_name if p.employee else None,
        department=p.employee.department if p.employee else None,
        designation=p.employee.designation if p.employee else None,
        basic_salary=p.basic_salary,
        deductions=p.deductions,
        bonus=p.bonus,
        net_salary=p.net_salary,
        month=p.month,
        created_at=p.created_at
    )

@router.post("/generate", response_model=PayrollOut, status_code=status.HTTP_201_CREATED)
def generate_payroll(
    payroll_in: PayrollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.HR]))
):
    emp = db.query(Employee).filter(Employee.id == payroll_in.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check if payroll for this month and employee already exists
    existing = db.query(Payroll).filter(
        Payroll.employee_id == payroll_in.employee_id,
        Payroll.month == payroll_in.month
    ).first()

    net_calculated = round(payroll_in.basic_salary + payroll_in.bonus - payroll_in.deductions, 2)

    if existing:
        existing.basic_salary = payroll_in.basic_salary
        existing.deductions = payroll_in.deductions
        existing.bonus = payroll_in.bonus
        existing.net_salary = net_calculated
        record = existing
    else:
        record = Payroll(
            employee_id=payroll_in.employee_id,
            basic_salary=payroll_in.basic_salary,
            deductions=payroll_in.deductions,
            bonus=payroll_in.bonus,
            net_salary=net_calculated,
            month=payroll_in.month,
            created_at=datetime.utcnow()
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    # Trigger notification to employee
    if emp.user:
        notif = Notification(
            user_id=emp.user.id,
            title=f"Payslip Generated for {record.month}",
            message=f"Your payslip for {record.month} is now available. Net Salary: ${record.net_salary:,.2f}."
        )
        db.add(notif)
        db.commit()

    return PayrollOut(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=emp.full_name,
        department=emp.department,
        designation=emp.designation,
        basic_salary=record.basic_salary,
        deductions=record.deductions,
        bonus=record.bonus,
        net_salary=record.net_salary,
        month=record.month,
        created_at=record.created_at
    )
