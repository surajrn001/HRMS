from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
import models
import schemas
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/feedback", tags=["Employee Feedback"])

@router.get("", response_model=List[schemas.FeedbackOut])
def get_feedback_list(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Feedback).join(models.Employee)

    # Ownership check: Employees view only their own feedback; HR/Admin views all
    if current_user.role == models.UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(models.Feedback.employee_id == current_user.employee.id)

    feedbacks = query.order_by(models.Feedback.created_at.desc()).all()

    return [
        schemas.FeedbackOut(
            id=f.id,
            employee_id=f.employee_id,
            employee_name=f.employee.full_name if f.employee else None,
            department=f.employee.department if f.employee else None,
            message=f.message,
            rating=f.rating,
            created_at=f.created_at
        )
        for f in feedbacks
    ]

@router.get("/summary", response_model=schemas.FeedbackSummary)
def get_feedback_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    all_fb = db.query(models.Feedback).all()
    total = len(all_fb)
    if total == 0:
        return schemas.FeedbackSummary(
            total_feedbacks=0,
            average_rating=0.0,
            rating_distribution={"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
        )

    avg_rating = round(sum(f.rating for f in all_fb) / total, 2)
    distribution = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
    for f in all_fb:
        key = str(min(5, max(1, int(round(f.rating)))))
        distribution[key] = distribution.get(key, 0) + 1

    return schemas.FeedbackSummary(
        total_feedbacks=total,
        average_rating=avg_rating,
        rating_distribution=distribution
    )

@router.post("", response_model=schemas.FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    fb_in: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.employee:
        raise HTTPException(
            status_code=400,
            detail="User account is not linked to an employee record"
        )

    if fb_in.rating < 1.0 or fb_in.rating > 5.0:
        raise HTTPException(status_code=400, detail="Rating must be between 1.0 and 5.0")

    feedback = models.Feedback(
        employee_id=current_user.employee.id,
        message=fb_in.message.strip(),
        rating=round(float(fb_in.rating), 1),
        created_at=datetime.utcnow()
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    # In-app notification to HR/Admins
    hr_admins = db.query(models.User).filter(
        models.User.role.in_([models.UserRole.ADMIN, models.UserRole.HR]),
        models.User.is_active == True
    ).all()
    for u in hr_admins:
        notif = models.Notification(
            user_id=u.id,
            title="New Employee Feedback Received",
            message=f"Received a {feedback.rating}★ feedback submission from {current_user.employee.full_name}.",
            category="FEEDBACK"
        )
        db.add(notif)
    db.commit()

    return schemas.FeedbackOut(
        id=feedback.id,
        employee_id=feedback.employee_id,
        employee_name=current_user.employee.full_name,
        department=current_user.employee.department,
        message=feedback.message,
        rating=feedback.rating,
        created_at=feedback.created_at
    )
