from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])

@router.get("", response_model=List[schemas.OnboardingOut])
def get_onboarding_tasks(
    employee_id: Optional[int] = None,
    status_filter: Optional[models.OnboardingStatus] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Onboarding).join(models.Employee)

    # Ownership / Role check
    if current_user.role == models.UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(models.Onboarding.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(models.Onboarding.employee_id == employee_id)

    if status_filter:
        query = query.filter(models.Onboarding.status == status_filter)

    tasks = query.order_by(models.Onboarding.due_date.asc(), models.Onboarding.id.asc()).all()
    today = date.today()

    return [
        schemas.OnboardingOut(
            id=t.id,
            employee_id=t.employee_id,
            employee_name=t.employee.full_name if t.employee else None,
            department=t.employee.department if t.employee else None,
            task_name=t.task_name,
            status=t.status,
            due_date=t.due_date,
            is_overdue=(t.due_date < today and t.status == models.OnboardingStatus.PENDING)
        )
        for t in tasks
    ]

@router.get("/progress", response_model=schemas.OnboardingProgress)
def get_employee_onboarding_progress(
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    target_emp_id = employee_id
    if current_user.role == models.UserRole.EMPLOYEE:
        if not current_user.employee:
            raise HTTPException(status_code=404, detail="Employee record not linked")
        target_emp_id = current_user.employee.id
    elif not target_emp_id:
        if current_user.employee:
            target_emp_id = current_user.employee.id
        else:
            first_emp = db.query(models.Employee).first()
            if not first_emp:
                raise HTTPException(status_code=404, detail="No employees found")
            target_emp_id = first_emp.id

    emp = db.query(models.Employee).filter(models.Employee.id == target_emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    tasks = db.query(models.Onboarding).filter(
        models.Onboarding.employee_id == target_emp_id
    ).order_by(models.Onboarding.due_date.asc()).all()

    today = date.today()
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == models.OnboardingStatus.COMPLETED)
    pending = total - completed
    pct = round((completed / total * 100.0), 1) if total > 0 else 0.0

    task_outs = [
        schemas.OnboardingOut(
            id=t.id,
            employee_id=t.employee_id,
            employee_name=emp.full_name,
            department=emp.department,
            task_name=t.task_name,
            status=t.status,
            due_date=t.due_date,
            is_overdue=(t.due_date < today and t.status == models.OnboardingStatus.PENDING)
        )
        for t in tasks
    ]

    return schemas.OnboardingProgress(
        employee_id=emp.id,
        employee_name=emp.full_name,
        department=emp.department,
        total_tasks=total,
        completed_tasks=completed,
        pending_tasks=pending,
        progress_percentage=pct,
        tasks=task_outs
    )

@router.get("/overview", response_model=List[schemas.OnboardingProgress])
def get_all_onboarding_overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    employees = db.query(models.Employee).filter(models.Employee.status == models.EmployeeStatus.ACTIVE).all()
    today = date.today()
    results = []

    for emp in employees:
        tasks = db.query(models.Onboarding).filter(models.Onboarding.employee_id == emp.id).all()
        if not tasks:
            continue
        total = len(tasks)
        completed = sum(1 for t in tasks if t.status == models.OnboardingStatus.COMPLETED)
        pct = round((completed / total * 100.0), 1) if total > 0 else 0.0

        task_outs = [
            schemas.OnboardingOut(
                id=t.id,
                employee_id=t.employee_id,
                employee_name=emp.full_name,
                department=emp.department,
                task_name=t.task_name,
                status=t.status,
                due_date=t.due_date,
                is_overdue=(t.due_date < today and t.status == models.OnboardingStatus.PENDING)
            )
            for t in tasks
        ]

        results.append(schemas.OnboardingProgress(
            employee_id=emp.id,
            employee_name=emp.full_name,
            department=emp.department,
            total_tasks=total,
            completed_tasks=completed,
            pending_tasks=total - completed,
            progress_percentage=pct,
            tasks=task_outs
        ))

    return results

@router.post("", response_model=schemas.OnboardingOut, status_code=status.HTTP_201_CREATED)
def create_onboarding_task(
    task_in: schemas.OnboardingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    emp = db.query(models.Employee).filter(models.Employee.id == task_in.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    new_task = models.Onboarding(
        employee_id=task_in.employee_id,
        task_name=task_in.task_name,
        due_date=task_in.due_date,
        status=task_in.status or models.OnboardingStatus.PENDING
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # In-app notification to employee
    if emp.user_id:
        notif = models.Notification(
            user_id=emp.user_id,
            title="New Onboarding Task Assigned",
            message=f"You have been assigned onboarding task: '{new_task.task_name}' due on {new_task.due_date}.",
            category="ONBOARDING"
        )
        db.add(notif)
        db.commit()

    return schemas.OnboardingOut(
        id=new_task.id,
        employee_id=new_task.employee_id,
        employee_name=emp.full_name,
        department=emp.department,
        task_name=new_task.task_name,
        status=new_task.status,
        due_date=new_task.due_date,
        is_overdue=(new_task.due_date < date.today() and new_task.status == models.OnboardingStatus.PENDING)
    )

@router.post("/assign-defaults/{employee_id}", response_model=List[schemas.OnboardingOut])
def assign_default_onboarding_checklist(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    default_tasks = [
        ("Submit Identity, Address Proof & Signed Offer Letter", 3),
        ("Complete IT Equipment Setup & Development Environment", 5),
        ("Attend HR Culture & WorkSphere Platform Orientation", 7),
        ("Setup WorkSphere Profile, Emergency Contact & Settings", 2),
        ("Schedule 1:1 Introduction with Department Manager", 10),
        ("Review Company Policies, Code of Conduct & Information Security", 14),
    ]

    today = date.today()
    created = []
    for task_name, days_ahead in default_tasks:
        due = today.replace(day=min(28, today.day + days_ahead)) if today.day + days_ahead <= 28 else today
        task = models.Onboarding(
            employee_id=emp.id,
            task_name=task_name,
            due_date=due,
            status=models.OnboardingStatus.PENDING
        )
        db.add(task)
        created.append(task)

    db.commit()
    for t in created:
        db.refresh(t)

    if emp.user_id:
        notif = models.Notification(
            user_id=emp.user_id,
            title="Welcome! Onboarding Checklist Ready",
            message=f"Your onboarding checklist ({len(created)} items) has been populated. Please review and complete your checklist.",
            category="ONBOARDING"
        )
        db.add(notif)
        db.commit()

    return [
        schemas.OnboardingOut(
            id=t.id,
            employee_id=t.employee_id,
            employee_name=emp.full_name,
            department=emp.department,
            task_name=t.task_name,
            status=t.status,
            due_date=t.due_date,
            is_overdue=False
        )
        for t in created
    ]

@router.put("/{task_id}/status", response_model=schemas.OnboardingOut)
def update_onboarding_task_status(
    task_id: int,
    status_update: schemas.OnboardingUpdateStatus,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.Onboarding).filter(models.Onboarding.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Onboarding task not found")

    # Ownership check: employees can only update their own onboarding tasks
    if current_user.role == models.UserRole.EMPLOYEE:
        if not current_user.employee or task.employee_id != current_user.employee.id:
            raise HTTPException(status_code=403, detail="Permission denied to modify this task")

    task.status = status_update.status
    db.commit()
    db.refresh(task)

    return schemas.OnboardingOut(
        id=task.id,
        employee_id=task.employee_id,
        employee_name=task.employee.full_name if task.employee else None,
        department=task.employee.department if task.employee else None,
        task_name=task.task_name,
        status=task.status,
        due_date=task.due_date,
        is_overdue=(task.due_date < date.today() and task.status == models.OnboardingStatus.PENDING)
    )

@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_onboarding_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    task = db.query(models.Onboarding).filter(models.Onboarding.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Onboarding task not found")

    db.delete(task)
    db.commit()
    return {"message": "Onboarding task deleted successfully"}
