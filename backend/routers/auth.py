from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from database import get_db
from models import User, Employee, UserRole, Notification
from schemas import UserCreate, UserLogin, UserOut, Token
from auth import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_pw,
        role=user_in.role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    welcome_notif = Notification(
        user_id=new_user.id,
        title="Welcome to WorkSphere!",
        message="Your account has been created successfully. Welcome aboard!"
    )
    db.add(welcome_notif)
    db.commit()

    return UserOut(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        employee_id=None,
        full_name=None,
        department=None,
        designation=None
    )

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == credentials.username) | (User.email == credentials.username)
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact your system administrator."
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value, "user_id": user.id}
    )

    emp_id = user.employee.id if user.employee else None
    emp_name = user.employee.full_name if user.employee else user.username
    dept = user.employee.department if user.employee else None
    desig = user.employee.designation if user.employee else None

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "employee_id": emp_id,
            "full_name": emp_name,
            "department": dept,
            "designation": desig
        }
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    emp_id = current_user.employee.id if current_user.employee else None
    emp_name = current_user.employee.full_name if current_user.employee else current_user.username
    dept = current_user.employee.department if current_user.employee else None
    desig = current_user.employee.designation if current_user.employee else None

    return UserOut(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        employee_id=emp_id,
        full_name=emp_name,
        department=dept,
        designation=desig
    )
