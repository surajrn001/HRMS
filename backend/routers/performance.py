from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
import models
import schemas
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/performance", tags=["Performance"])

@router.get("", response_model=List[schemas.PerformanceOut])
def get_performance_reviews(
    employee_id: Optional[int] = None,
    review_period: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Performance).join(models.Employee)

    # RBAC: Employees can view only their own performance reviews
    if current_user.role.value == "EMPLOYEE":
        if not current_user.employee:
            return []
        query = query.filter(models.Performance.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(models.Performance.employee_id == employee_id)

    if review_period:
        query = query.filter(models.Performance.review_period == review_period)

    reviews = query.order_by(models.Performance.created_at.desc()).all()
    results = []
    for r in reviews:
        results.append(schemas.PerformanceOut(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=r.employee.full_name if r.employee else None,
            department=r.employee.department if r.employee else None,
            review_period=r.review_period,
            rating=r.rating,
            feedback=r.feedback,
            reviewer_name=r.reviewer_name,
            goals=r.goals,
            created_at=r.created_at
        ))
    return results

@router.post("", response_model=schemas.PerformanceOut, status_code=status.HTTP_201_CREATED)
def create_performance_review(
    review_in: schemas.PerformanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "HR"]))
):
    emp = db.query(models.Employee).filter(models.Employee.id == review_in.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if review_in.rating < 1.0 or review_in.rating > 5.0:
        raise HTTPException(status_code=400, detail="Rating must be between 1.0 and 5.0")

    reviewer = review_in.reviewer_name or current_user.username

    review = models.Performance(
        employee_id=emp.id,
        review_period=review_in.review_period,
        rating=review_in.rating,
        feedback=review_in.feedback,
        reviewer_name=reviewer,
        goals=review_in.goals
    )
    db.add(review)

    # Smart Notification to the employee
    if emp.user_id:
        notif = models.Notification(
            user_id=emp.user_id,
            title=f"Performance Review: {review_in.review_period}",
            message=f"A performance review ({review_in.rating}★) has been recorded by {reviewer}.",
            category="PERFORMANCE"
        )
        db.add(notif)

    db.commit()
    db.refresh(review)

    return schemas.PerformanceOut(
        id=review.id,
        employee_id=emp.id,
        employee_name=emp.full_name,
        department=emp.department,
        review_period=review.review_period,
        rating=review.rating,
        feedback=review.feedback,
        reviewer_name=review.reviewer_name,
        goals=review.goals,
        created_at=review.created_at
    )

@router.put("/{review_id}", response_model=schemas.PerformanceOut)
def update_performance_review(
    review_id: int,
    review_in: schemas.PerformanceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "HR"]))
):
    review = db.query(models.Performance).filter(models.Performance.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Performance review not found")

    if review_in.rating is not None:
        if review_in.rating < 1.0 or review_in.rating > 5.0:
            raise HTTPException(status_code=400, detail="Rating must be between 1.0 and 5.0")
        review.rating = review_in.rating
    if review_in.feedback is not None:
        review.feedback = review_in.feedback
    if review_in.goals is not None:
        review.goals = review_in.goals

    db.commit()
    db.refresh(review)

    return schemas.PerformanceOut(
        id=review.id,
        employee_id=review.employee_id,
        employee_name=review.employee.full_name if review.employee else None,
        department=review.employee.department if review.employee else None,
        review_period=review.review_period,
        rating=review.rating,
        feedback=review.feedback,
        reviewer_name=review.reviewer_name,
        goals=review.goals,
        created_at=review.created_at
    )

@router.delete("/{review_id}")
def delete_performance_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "HR"]))
):
    review = db.query(models.Performance).filter(models.Performance.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Performance review not found")
    db.delete(review)
    db.commit()
    return {"message": "Performance review deleted successfully"}

@router.get("/stats", response_model=schemas.PerformanceStatsOut)
def get_performance_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["ADMIN", "HR"]))
):
    reviews = db.query(models.Performance).all()
    total = len(reviews)
    if total == 0:
        return schemas.PerformanceStatsOut(
            total_reviews=0,
            average_rating=0.0,
            rating_distribution={"5_stars": 0, "4_stars": 0, "3_stars": 0, "2_stars": 0, "1_star": 0}
        )

    avg = sum(r.rating for r in reviews) / total
    distribution = {
        "5_stars": sum(1 for r in reviews if r.rating >= 4.5),
        "4_stars": sum(1 for r in reviews if 3.5 <= r.rating < 4.5),
        "3_stars": sum(1 for r in reviews if 2.5 <= r.rating < 3.5),
        "2_stars": sum(1 for r in reviews if 1.5 <= r.rating < 2.5),
        "1_star": sum(1 for r in reviews if r.rating < 1.5)
    }

    return schemas.PerformanceStatsOut(
        total_reviews=total,
        average_rating=round(avg, 2),
        rating_distribution=distribution
    )
