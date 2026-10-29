from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/resignations", tags=["Resignations & Exit Management"])

@router.get("", response_model=List[schemas.ResignationOut])
def get_resignations(
    status_filter: Optional[models.ResignationStatus] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Resignation).join(models.Employee)

    # Ownership / Role check
    if current_user.role == models.UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(models.Resignation.employee_id == current_user.employee.id)
    else:
        # Admin / HR sees all
        pass

    if status_filter:
        query = query.filter(models.Resignation.status == status_filter)

    records = query.order_by(models.Resignation.created_at.desc()).all()
    return [
        schemas.ResignationOut(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=r.employee.full_name if r.employee else None,
            department=r.employee.department if r.employee else None,
            designation=r.employee.designation if r.employee else None,
            reason=r.reason,
            notice_period=r.notice_period,
            status=r.status,
            created_at=r.created_at
        )
        for r in records
    ]

@router.get("/{resignation_id}", response_model=schemas.ResignationOut)
def get_resignation_detail(
    resignation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    record = db.query(models.Resignation).filter(models.Resignation.id == resignation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Resignation record not found")

    if current_user.role == models.UserRole.EMPLOYEE:
        if not current_user.employee or record.employee_id != current_user.employee.id:
            raise HTTPException(status_code=403, detail="Access denied to this record")

    return schemas.ResignationOut(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=record.employee.full_name if record.employee else None,
        department=record.employee.department if record.employee else None,
        designation=record.employee.designation if record.employee else None,
        reason=record.reason,
        notice_period=record.notice_period,
        status=record.status,
        created_at=record.created_at
    )

@router.post("", response_model=schemas.ResignationOut, status_code=status.HTTP_201_CREATED)
def submit_resignation(
    res_in: schemas.ResignationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.employee:
        raise HTTPException(status_code=400, detail="User account is not linked to an active employee record")

    # Check if there is already a PENDING resignation
    existing = db.query(models.Resignation).filter(
        models.Resignation.employee_id == current_user.employee.id,
        models.Resignation.status == models.ResignationStatus.PENDING
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have an active pending resignation request in review."
        )

    resignation = models.Resignation(
        employee_id=current_user.employee.id,
        reason=res_in.reason,
        notice_period=res_in.notice_period or "30 Days",
        status=models.ResignationStatus.PENDING,
        created_at=datetime.utcnow()
    )
    db.add(resignation)
    db.commit()
    db.refresh(resignation)

    # Notify HR & Admin users
    hr_admins = db.query(models.User).filter(
        models.User.role.in_([models.UserRole.ADMIN, models.UserRole.HR]),
        models.User.is_active == True
    ).all()
    for admin_user in hr_admins:
        notif = models.Notification(
            user_id=admin_user.id,
            title="Resignation Request Submitted",
            message=f"{current_user.employee.full_name} ({current_user.employee.department}) has submitted a resignation request.",
            category="RESIGNATION"
        )
        db.add(notif)
    db.commit()

    return schemas.ResignationOut(
        id=resignation.id,
        employee_id=resignation.employee_id,
        employee_name=current_user.employee.full_name,
        department=current_user.employee.department,
        designation=current_user.employee.designation,
        reason=resignation.reason,
        notice_period=resignation.notice_period,
        status=resignation.status,
        created_at=resignation.created_at
    )

@router.put("/{resignation_id}/status", response_model=schemas.ResignationOut)
def update_resignation_status(
    resignation_id: int,
    status_update: schemas.ResignationUpdateStatus,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    record = db.query(models.Resignation).filter(models.Resignation.id == resignation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Resignation record not found")

    record.status = status_update.status
    db.commit()
    db.refresh(record)

    # If APPROVED, notify employee
    if record.employee and record.employee.user_id:
        status_text = "APPROVED" if record.status == models.ResignationStatus.APPROVED else "REJECTED"
        notif = models.Notification(
            user_id=record.employee.user_id,
            title=f"Resignation Request {status_text}",
            message=f"Your resignation request has been {status_text.lower()} by HR/Management.",
            category="RESIGNATION"
        )
        db.add(notif)
        db.commit()

    return schemas.ResignationOut(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=record.employee.full_name if record.employee else None,
        department=record.employee.department if record.employee else None,
        designation=record.employee.designation if record.employee else None,
        reason=record.reason,
        notice_period=record.notice_period,
        status=record.status,
        created_at=record.created_at
    )
