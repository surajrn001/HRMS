from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, Employee, UserRole, Notification
from schemas import (
    UserOut,
    UserCreate,
    UserRoleUpdate,
    UserStatusUpdate,
    UserPasswordReset,
)
from auth import require_roles, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Admin Controls & User Management"])
admin_required = require_roles([UserRole.ADMIN])

def _to_user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        username=u.username,
        email=u.email,
        role=u.role,
        is_active=u.is_active,
        created_at=u.created_at,
        employee_id=u.employee.id if u.employee else None,
        full_name=u.employee.full_name if u.employee else None,
        department=u.employee.department if u.employee else None,
        designation=u.employee.designation if u.employee else None,
    )

@router.get("/users", response_model=List[UserOut])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    users = db.query(User).order_by(User.id.asc()).all()
    return [_to_user_out(u) for u in users]

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email address already registered")

    target_emp = None
    if user_in.employee_id:
        target_emp = db.query(Employee).filter(Employee.id == user_in.employee_id).first()
        if not target_emp:
            raise HTTPException(status_code=404, detail="Specified employee not found")
        if target_emp.user_id:
            raise HTTPException(status_code=400, detail="This employee is already linked to a user account")

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if target_emp:
        target_emp.user_id = new_user.id
        db.commit()
        db.refresh(new_user)

    db.add(Notification(
        user_id=new_user.id,
        title="Account Provisioned by Administrator",
        message=f"Your WorkSphere account has been provisioned with role: {new_user.role.value}."
    ))
    db.commit()

    return _to_user_out(new_user)

@router.put("/users/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.id == current_user.id and payload.role != UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot demote yourself from ADMIN role.")

    target.role = payload.role
    db.commit()
    db.refresh(target)

    db.add(Notification(
        user_id=target.id,
        title="Role Access Updated",
        message=f"Your system role has been updated to {target.role.value} by Administrator {current_user.username}."
    ))
    db.commit()

    return _to_user_out(target)

@router.put("/users/{user_id}/status", response_model=UserOut)
def toggle_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own administrator account.")

    target.is_active = payload.is_active
    db.commit()
    db.refresh(target)

    return _to_user_out(target)

@router.put("/users/{user_id}/password")
def reset_user_password(
    user_id: int,
    payload: UserPasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.hashed_password = get_password_hash(payload.new_password)
    db.commit()

    db.add(Notification(
        user_id=target.id,
        title="Security Alert: Password Reset",
        message="Your account password was reset by a system administrator."
    ))
    db.commit()

    return {"message": f"Password for user '{target.username}' successfully reset."}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own active administrator account")

    username = target.username
    db.delete(target)
    db.commit()

    return {"message": f"User account '{username}' successfully deleted"}

@router.get("/system-stats")
def get_system_security_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    deactivated_users = total_users - active_users

    admin_count = db.query(User).filter(User.role == UserRole.ADMIN).count()
    hr_count = db.query(User).filter(User.role == UserRole.HR).count()
    employee_count = db.query(User).filter(User.role == UserRole.EMPLOYEE).count()

    total_staff = db.query(Employee).count()
    unlinked_employees = db.query(Employee).filter(Employee.user_id == None).count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "deactivated_users": deactivated_users,
        "role_distribution": {
            "ADMIN": admin_count,
            "HR": hr_count,
            "EMPLOYEE": employee_count
        },
        "total_staff": total_staff,
        "unlinked_employees": unlinked_employees
    }
