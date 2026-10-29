from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
import models
import schemas
from auth import get_current_user, require_roles

router = APIRouter(prefix="/api/announcements", tags=["Internal Announcements"])

@router.get("", response_model=List[schemas.AnnouncementOut])
def get_announcements(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Announcement)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(models.Announcement.title.ilike(s), models.Announcement.message.ilike(s)))

    announcements = query.order_by(models.Announcement.created_at.desc()).all()

    results = []
    for a in announcements:
        author_name = "WorkSphere Management"
        author_role = "HR / Management"
        if a.author:
            author_name = a.author.employee.full_name if a.author.employee else a.author.username
            author_role = a.author.role.value

        results.append(schemas.AnnouncementOut(
            id=a.id,
            title=a.title,
            message=a.message,
            created_by=a.created_by,
            author_name=author_name,
            author_role=author_role,
            created_at=a.created_at
        ))
    return results

@router.get("/{announcement_id}", response_model=schemas.AnnouncementOut)
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    a = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")

    author_name = "WorkSphere Management"
    author_role = "HR / Management"
    if a.author:
        author_name = a.author.employee.full_name if a.author.employee else a.author.username
        author_role = a.author.role.value

    return schemas.AnnouncementOut(
        id=a.id,
        title=a.title,
        message=a.message,
        created_by=a.created_by,
        author_name=author_name,
        author_role=author_role,
        created_at=a.created_at
    )

@router.post("", response_model=schemas.AnnouncementOut, status_code=status.HTTP_201_CREATED)
def create_announcement(
    ann_in: schemas.AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    new_ann = models.Announcement(
        title=ann_in.title.strip(),
        message=ann_in.message.strip(),
        created_by=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(new_ann)
    db.commit()
    db.refresh(new_ann)

    # Broadcast notification to all active users
    active_users = db.query(models.User).filter(models.User.is_active == True).all()
    for u in active_users:
        notif = models.Notification(
            user_id=u.id,
            title=f"📢 {new_ann.title}",
            message=new_ann.message[:180] + ("..." if len(new_ann.message) > 180 else ""),
            category="ANNOUNCEMENT"
        )
        db.add(notif)
    db.commit()

    author_name = current_user.employee.full_name if current_user.employee else current_user.username
    return schemas.AnnouncementOut(
        id=new_ann.id,
        title=new_ann.title,
        message=new_ann.message,
        created_by=new_ann.created_by,
        author_name=author_name,
        author_role=current_user.role.value,
        created_at=new_ann.created_at
    )

@router.delete("/{announcement_id}", status_code=status.HTTP_200_OK)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles([models.UserRole.ADMIN, models.UserRole.HR]))
):
    a = db.query(models.Announcement).filter(models.Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Announcement not found")

    db.delete(a)
    db.commit()
    return {"message": "Announcement deleted successfully"}
