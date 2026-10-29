from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import get_current_user, verify_password, get_password_hash

router = APIRouter(prefix="/api/profile", tags=["Profile & Settings Management"])

@router.get("", response_model=schemas.UserProfileOut)
def get_user_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    emp = current_user.employee
    settings = current_user.settings
    if not settings:
        settings = models.UserSettings(
            user_id=current_user.id,
            email_notifications=True,
            in_app_notifications=True,
            leave_alerts=True,
            task_alerts=True,
            announcement_alerts=True
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    settings_out = schemas.UserSettingsOut(
        email_notifications=settings.email_notifications,
        in_app_notifications=settings.in_app_notifications,
        leave_alerts=settings.leave_alerts,
        task_alerts=settings.task_alerts,
        announcement_alerts=settings.announcement_alerts
    )

    return schemas.UserProfileOut(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        employee_id=emp.id if emp else None,
        full_name=emp.full_name if emp else current_user.username,
        designation=emp.designation if emp else None,
        department=emp.department if emp else None,
        joining_date=emp.joining_date if emp else None,
        salary=emp.salary if emp else None,
        phone=emp.phone if emp else None,
        address=emp.address if emp else None,
        emergency_contact=emp.emergency_contact if emp else None,
        bio=emp.bio if emp else None,
        settings=settings_out
    )

@router.put("", response_model=schemas.UserProfileOut)
def update_user_profile(
    update_in: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    emp = current_user.employee
    if not emp:
        raise HTTPException(status_code=400, detail="User account is not linked to an employee profile")

    if update_in.full_name is not None:
        emp.full_name = update_in.full_name.strip()
    if update_in.phone is not None:
        emp.phone = update_in.phone.strip()
    if update_in.address is not None:
        emp.address = update_in.address.strip()
    if update_in.emergency_contact is not None:
        emp.emergency_contact = update_in.emergency_contact.strip()
    if update_in.bio is not None:
        emp.bio = update_in.bio.strip()

    db.commit()
    db.refresh(emp)

    return get_user_profile(db=db, current_user=current_user)

@router.put("/password", status_code=status.HTTP_200_OK)
def change_password(
    pwd_in: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not verify_password(pwd_in.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    if len(pwd_in.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )

    current_user.hashed_password = get_password_hash(pwd_in.new_password)
    db.commit()

    # Create security alert notification
    notif = models.Notification(
        user_id=current_user.id,
        title="Security Alert: Password Changed",
        message="Your WorkSphere account password was successfully updated.",
        category="SYSTEM"
    )
    db.add(notif)
    db.commit()

    return {"message": "Password changed successfully"}

@router.get("/settings", response_model=schemas.UserSettingsOut)
def get_user_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    settings = current_user.settings
    if not settings:
        settings = models.UserSettings(
            user_id=current_user.id,
            email_notifications=True,
            in_app_notifications=True,
            leave_alerts=True,
            task_alerts=True,
            announcement_alerts=True
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return schemas.UserSettingsOut(
        email_notifications=settings.email_notifications,
        in_app_notifications=settings.in_app_notifications,
        leave_alerts=settings.leave_alerts,
        task_alerts=settings.task_alerts,
        announcement_alerts=settings.announcement_alerts
    )

@router.put("/settings", response_model=schemas.UserSettingsOut)
def update_user_settings(
    update_in: schemas.UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    settings = current_user.settings
    if not settings:
        settings = models.UserSettings(user_id=current_user.id)
        db.add(settings)

    if update_in.email_notifications is not None:
        settings.email_notifications = update_in.email_notifications
    if update_in.in_app_notifications is not None:
        settings.in_app_notifications = update_in.in_app_notifications
    if update_in.leave_alerts is not None:
        settings.leave_alerts = update_in.leave_alerts
    if update_in.task_alerts is not None:
        settings.task_alerts = update_in.task_alerts
    if update_in.announcement_alerts is not None:
        settings.announcement_alerts = update_in.announcement_alerts

    db.commit()
    db.refresh(settings)

    return schemas.UserSettingsOut(
        email_notifications=settings.email_notifications,
        in_app_notifications=settings.in_app_notifications,
        leave_alerts=settings.leave_alerts,
        task_alerts=settings.task_alerts,
        announcement_alerts=settings.announcement_alerts
    )
