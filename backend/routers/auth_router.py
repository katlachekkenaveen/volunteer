import os
import hmac
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import User, UserRole, UserStatus, Attendance
from backend.schemas import UserRegister, AdminRegister, UserLogin, TokenResponse, UserResponse, UserProfileUpdate
from backend.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def get_user_total_hours(user_id: int, db: Session) -> float:
    total = db.query(func.sum(Attendance.hours_worked))\
              .filter(Attendance.volunteer_id == user_id, Attendance.status == "completed")\
              .scalar()
    return round(float(total), 2) if total else 0.0

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if email exists
    existing = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Public registration route strictly registers volunteers in pending status
    role = UserRole.VOLUNTEER.value
    user_status = UserStatus.PENDING.value

    new_user = User(
        name=user_data.name.strip(),
        email=user_data.email.lower().strip(),
        phone=user_data.phone.strip(),
        password_hash=hash_password(user_data.password),
        role=role,
        status=user_status,
        skills=user_data.skills,
        availability=user_data.availability,
        bio=user_data.bio
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    response = UserResponse.model_validate(new_user)
    response.total_hours = 0.0
    return response

@router.post("/admin/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_admin(admin_data: AdminRegister, db: Session = Depends(get_db)):
    # Verify Admin Key using constant-time comparison to prevent timing attacks
    secret_key = os.getenv("ADMIN_REGISTRATION_KEY", "admin-secret-key-2026")
    if not hmac.compare_digest(admin_data.admin_key.strip(), secret_key.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Admin Registration Key."
        )

    # Check if email exists
    existing = db.query(User).filter(User.email == admin_data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    new_admin = User(
        name=admin_data.name.strip(),
        email=admin_data.email.lower().strip(),
        phone=admin_data.phone.strip() if admin_data.phone else "+1 555-0100",
        password_hash=hash_password(admin_data.password),
        role=UserRole.ADMIN.value,
        status=UserStatus.APPROVED.value,
        skills="System Administration, Event Coordination",
        availability="Full-time",
        bio="System Administrator"
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    response = UserResponse.model_validate(new_admin)
    response.total_hours = 0.0
    return response

@router.post("/login", response_model=TokenResponse)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower().strip()).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    
    user_resp = UserResponse.model_validate(user)
    user_resp.total_hours = get_user_total_hours(user.id, db)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_resp
    )

@router.get("/me", response_model=UserResponse)
def get_current_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    response = UserResponse.model_validate(current_user)
    response.total_hours = get_user_total_hours(current_user.id, db)
    return response

@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_data.name is not None:
        current_user.name = profile_data.name.strip()
    if profile_data.phone is not None:
        current_user.phone = profile_data.phone.strip()
    if profile_data.skills is not None:
        current_user.skills = profile_data.skills
    if profile_data.availability is not None:
        current_user.availability = profile_data.availability
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio

    db.commit()
    db.refresh(current_user)

    response = UserResponse.model_validate(current_user)
    response.total_hours = get_user_total_hours(current_user.id, db)
    return response
