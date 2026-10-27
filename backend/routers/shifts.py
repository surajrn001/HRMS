from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional

from database import get_db
import models
import schemas
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/shifts", tags=["Shifts"])

@router.get("", response_model=List[schemas.ShiftOut])
def get_shifts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Shift).order_by(models.Shift.id).all()

@router.post("", response_model=schemas.ShiftOut, status_code=status.HTTP_201_CREATED)
def create_shift(
    shift_in: schemas.ShiftCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "HR"]))
):
    existing = db.query(models.Shift).filter(models.Shift.name.ilike(shift_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Shift with this name already exists")
    
    new_shift = models.Shift(
        name=shift_in.name,
        start_time=shift_in.start_time,
        end_time=shift_in.end_time,
        description=shift_in.description
    )
    db.add(new_shift)
    db.commit()
    db.refresh(new_shift)
    return new_shift

@router.put("/{shift_id}", response_model=schemas.ShiftOut)
def update_shift(
    shift_id: int,
    shift_in: schemas.ShiftCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "HR"]))
):
    shift = db.query(models.Shift).filter(models.Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    shift.name = shift_in.name
    shift.start_time = shift_in.start_time
    shift.end_time = shift_in.end_time
    shift.description = shift_in.description
    db.commit()
    db.refresh(shift)
    return shift

@router.delete("/{shift_id}")
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN"]))
):
    shift = db.query(models.Shift).filter(models.Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(shift)
    db.commit()
    return {"message": "Shift deleted successfully"}

@router.get("/assignments", response_model=List[schemas.EmployeeShiftOut])
def get_shift_assignments(
    employee_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "HR"]))
):
    query = db.query(models.EmployeeShift).join(models.Employee).join(models.Shift)
    if employee_id:
        query = query.filter(models.EmployeeShift.employee_id == employee_id)
    if shift_id:
        query = query.filter(models.EmployeeShift.shift_id == shift_id)
    if active_only:
        query = query.filter(models.EmployeeShift.is_active == True)
    
    records = query.order_by(models.EmployeeShift.id.desc()).all()
    results = []
    for r in records:
        results.append(schemas.EmployeeShiftOut(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=r.employee.full_name if r.employee else None,
            department=r.employee.department if r.employee else None,
            shift_id=r.shift_id,
            shift_name=r.shift.name if r.shift else "Unknown",
            start_time=r.shift.start_time if r.shift else "09:00",
            end_time=r.shift.end_time if r.shift else "18:00",
            assigned_date=r.assigned_date,
            is_active=r.is_active
        ))
    return results

@router.get("/my-shift", response_model=Optional[schemas.EmployeeShiftOut])
def get_my_shift(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.employee:
        return None
    assignment = db.query(models.EmployeeShift).filter(
        models.EmployeeShift.employee_id == current_user.employee.id,
        models.EmployeeShift.is_active == True
    ).first()
    if not assignment:
        return None
    return schemas.EmployeeShiftOut(
        id=assignment.id,
        employee_id=assignment.employee_id,
        employee_name=current_user.employee.full_name,
        department=current_user.employee.department,
        shift_id=assignment.shift_id,
        shift_name=assignment.shift.name if assignment.shift else "General",
        start_time=assignment.shift.start_time if assignment.shift else "09:00",
        end_time=assignment.shift.end_time if assignment.shift else "18:00",
        assigned_date=assignment.assigned_date,
        is_active=assignment.is_active
    )

@router.post("/assign", response_model=schemas.EmployeeShiftOut)
def assign_shift(
    payload: schemas.EmployeeShiftAssign,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "HR"]))
):
    emp = db.query(models.Employee).filter(models.Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    shift = db.query(models.Shift).filter(models.Shift.id == payload.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Deactivate existing active shifts
    db.query(models.EmployeeShift).filter(
        models.EmployeeShift.employee_id == emp.id,
        models.EmployeeShift.is_active == True
    ).update({"is_active": False})

    new_assignment = models.EmployeeShift(
        employee_id=emp.id,
        shift_id=shift.id,
        assigned_date=date.today(),
        is_active=True
    )
    db.add(new_assignment)

    # Smart Notification to employee
    if emp.user_id:
        notif = models.Notification(
            user_id=emp.user_id,
            title="Shift Schedule Updated",
            message=f"You have been assigned to the {shift.name} shift ({shift.start_time} - {shift.end_time}).",
            category="SHIFT"
        )
        db.add(notif)

    db.commit()
    db.refresh(new_assignment)

    return schemas.EmployeeShiftOut(
        id=new_assignment.id,
        employee_id=emp.id,
        employee_name=emp.full_name,
        department=emp.department,
        shift_id=shift.id,
        shift_name=shift.name,
        start_time=shift.start_time,
        end_time=shift.end_time,
        assigned_date=new_assignment.assigned_date,
        is_active=new_assignment.is_active
    )
