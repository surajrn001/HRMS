from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import Payroll, Employee, User, UserRole, Notification
from schemas import PayrollCreate, PayrollOut, PayrollSummaryOut
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/payroll", tags=["Payroll Enhancements"])

def _to_payroll_out(p: Payroll, emp: Optional[Employee] = None) -> PayrollOut:
    employee = emp or p.employee
    return PayrollOut(
        id=p.id,
        employee_id=p.employee_id,
        employee_name=employee.full_name if employee else None,
        department=employee.department if employee else None,
        designation=employee.designation if employee else None,
        basic_salary=p.basic_salary,
        hra=p.hra,
        special_allowance=p.special_allowance,
        bonus=p.bonus,
        pf_deduction=p.pf_deduction,
        tax_deduction=p.tax_deduction,
        deductions=p.deductions,
        net_salary=p.net_salary,
        month=p.month,
        created_at=p.created_at
    )

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
    elif employee_id:
        query = query.filter(Payroll.employee_id == employee_id)

    if month:
        query = query.filter(Payroll.month == month)

    payrolls = query.order_by(Payroll.created_at.desc()).all()
    return [_to_payroll_out(p) for p in payrolls]

@router.get("/summary", response_model=PayrollSummaryOut)
def get_payroll_summary(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.HR]))
):
    query = db.query(Payroll)
    if month:
        query = query.filter(Payroll.month == month)
        target_month = month
    else:
        latest = query.order_by(Payroll.id.desc()).first()
        target_month = latest.month if latest else "Current"
        query = query.filter(Payroll.month == target_month)

    records = query.all()
    total_basic = sum(p.basic_salary for p in records)
    total_allow = sum(p.hra + p.special_allowance + p.bonus for p in records)
    total_ded = sum(p.deductions for p in records)
    total_net = sum(p.net_salary for p in records)

    return PayrollSummaryOut(
        month=target_month,
        total_employees=len(records),
        total_gross_disbursed=round(total_basic + total_allow, 2),
        total_basic=round(total_basic, 2),
        total_allowances=round(total_allow, 2),
        total_deductions=round(total_ded, 2),
        total_net_disbursed=round(total_net, 2)
    )

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

    return _to_payroll_out(p)

@router.post("/generate", response_model=PayrollOut, status_code=status.HTTP_201_CREATED)
def generate_payroll(
    payroll_in: PayrollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.HR]))
):
    emp = db.query(Employee).filter(Employee.id == payroll_in.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    basic = payroll_in.basic_salary
    hra = payroll_in.hra or round(basic * 0.40, 2)
    special = payroll_in.special_allowance or round(basic * 0.20, 2)
    bonus = payroll_in.bonus or 0.0

    pf = payroll_in.pf_deduction or round(basic * 0.12, 2)
    tax = payroll_in.tax_deduction or round(basic * 0.05 + 200.0, 2)
    total_deductions = payroll_in.deductions or round(pf + tax, 2)

    gross = basic + hra + special + bonus
    net = round(gross - total_deductions, 2)

    existing = db.query(Payroll).filter(
        Payroll.employee_id == payroll_in.employee_id,
        Payroll.month == payroll_in.month
    ).first()

    if existing:
        existing.basic_salary = basic
        existing.hra = hra
        existing.special_allowance = special
        existing.bonus = bonus
        existing.pf_deduction = pf
        existing.tax_deduction = tax
        existing.deductions = total_deductions
        existing.net_salary = net
        record = existing
    else:
        record = Payroll(
            employee_id=payroll_in.employee_id,
            basic_salary=basic,
            hra=hra,
            special_allowance=special,
            bonus=bonus,
            pf_deduction=pf,
            tax_deduction=tax,
            deductions=total_deductions,
            net_salary=net,
            month=payroll_in.month,
            created_at=datetime.utcnow()
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    if emp.user:
        db.add(Notification(
            user_id=emp.user.id,
            title=f"Payslip Generated for {record.month}",
            message=f"Payslip for {record.month} generated. Net Disbursed: ₹{record.net_salary:,.2f}.",
            category="PAYROLL"
        ))
        db.commit()

    return _to_payroll_out(record, emp)
