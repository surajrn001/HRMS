from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/tasks", tags=["Internal Tasks"])

@router.get("", response_model=List[schemas.TaskOut])
def get_tasks(
    assigned_to: Optional[int] = None,
    status_filter: Optional[models.TaskStatus] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Task).join(models.Employee)

    # Ownership check
    if current_user.role == models.UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(models.Task.assigned_to == current_user.employee.id)
    else:
        if assigned_to:
            query = query.filter(models.Task.assigned_to == assigned_to)

    if status_filter:
        query = query.filter(models.Task.status == status_filter)

    tasks = query.order_by(models.Task.due_date.asc(), models.Task.id.desc()).all()
    today = date.today()

    return [
        schemas.TaskOut(
            id=t.id,
            assigned_to=t.assigned_to,
            assignee_name=t.employee.full_name if t.employee else None,
            department=t.employee.department if t.employee else None,
            title=t.title,
            description=t.description,
            due_date=t.due_date,
            status=t.status,
            is_overdue=(t.due_date < today and t.status == models.TaskStatus.PENDING)
        )
        for t in tasks
    ]

@router.get("/stats", response_model=schemas.TaskStats)
def get_task_statistics(
    assigned_to: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Task)

    if current_user.role == models.UserRole.EMPLOYEE:
        if not current_user.employee:
            return schemas.TaskStats(
                total_tasks=0, pending_tasks=0, completed_tasks=0, overdue_tasks=0, completion_rate=0.0
            )
        query = query.filter(models.Task.assigned_to == current_user.employee.id)
    elif assigned_to:
        query = query.filter(models.Task.assigned_to == assigned_to)

    all_tasks = query.all()
    today = date.today()

    total = len(all_tasks)
    completed = sum(1 for t in all_tasks if t.status == models.TaskStatus.COMPLETED)
    pending = total - completed
    overdue = sum(1 for t in all_tasks if t.due_date < today and t.status == models.TaskStatus.PENDING)
    rate = round((completed / total * 100.0), 1) if total > 0 else 0.0

    return schemas.TaskStats(
        total_tasks=total,
        pending_tasks=pending,
        completed_tasks=completed,
        overdue_tasks=overdue,
        completion_rate=rate
    )

@router.post("", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def assign_task(
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    emp = db.query(models.Employee).filter(models.Employee.id == task_in.assigned_to).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Assignee employee not found")

    new_task = models.Task(
        assigned_to=task_in.assigned_to,
        title=task_in.title.strip(),
        description=task_in.description.strip() if task_in.description else None,
        due_date=task_in.due_date,
        status=models.TaskStatus.PENDING
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # In-app notification to the assigned employee
    if emp.user_id:
        notif = models.Notification(
            user_id=emp.user_id,
            title="New Task Assigned",
            message=f"You have been assigned: '{new_task.title}'. Due on {new_task.due_date}.",
            category="TASK"
        )
        db.add(notif)
        db.commit()

    return schemas.TaskOut(
        id=new_task.id,
        assigned_to=new_task.assigned_to,
        assignee_name=emp.full_name,
        department=emp.department,
        title=new_task.title,
        description=new_task.description,
        due_date=new_task.due_date,
        status=new_task.status,
        is_overdue=(new_task.due_date < date.today() and new_task.status == models.TaskStatus.PENDING)
    )

@router.put("/{task_id}/status", response_model=schemas.TaskOut)
def update_task_status(
    task_id: int,
    status_update: schemas.TaskUpdateStatus,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Ownership check
    if current_user.role == models.UserRole.EMPLOYEE:
        if not current_user.employee or task.assigned_to != current_user.employee.id:
            raise HTTPException(status_code=403, detail="Permission denied to update this task")

    task.status = status_update.status
    db.commit()
    db.refresh(task)

    return schemas.TaskOut(
        id=task.id,
        assigned_to=task.assigned_to,
        assignee_name=task.employee.full_name if task.employee else None,
        department=task.employee.department if task.employee else None,
        title=task.title,
        description=task.description,
        due_date=task.due_date,
        status=task.status,
        is_overdue=(task.due_date < date.today() and task.status == models.TaskStatus.PENDING)
    )

@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}
