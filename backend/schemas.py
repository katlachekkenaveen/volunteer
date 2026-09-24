from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
import re

try:
    from pydantic import EmailStr
    class _EmailCheck(BaseModel):
        e: EmailStr
except Exception:
    from typing_extensions import Annotated
    from pydantic import StringConstraints
    EmailStr = Annotated[str, StringConstraints(pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")]

# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=20)
    password: str = Field(..., min_length=8)
    skills: Optional[str] = None
    availability: Optional[str] = None
    bio: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[a-zA-Z]", v) or not re.search(r"[0-9]", v):
            raise ValueError("Password must contain both letters and numbers.")
        return v

class AdminRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    admin_key: str = Field(..., min_length=1)
    phone: Optional[str] = "+1 555-0100"

    @field_validator("password")
    @classmethod
    def validate_admin_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[a-zA-Z]", v) or not re.search(r"[0-9]", v):
            raise ValueError("Password must contain both letters and numbers.")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: str
    role: str
    status: str
    skills: Optional[str] = None
    availability: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    total_hours: Optional[float] = 0.0

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserStatusUpdate(BaseModel):
    status: str # 'approved', 'rejected', 'pending'

class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    phone: Optional[str] = Field(default=None, min_length=5, max_length=20)
    skills: Optional[str] = Field(default=None, max_length=500)
    availability: Optional[str] = Field(default=None, max_length=100)
    bio: Optional[str] = Field(default=None, max_length=1000)

# --- Event Schemas ---
class EventCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=150)
    description: Optional[str] = None
    location: str = Field(..., min_length=3, max_length=200)
    event_date: str # YYYY-MM-DD
    start_time: str # HH:MM or HH:MM:SS
    end_time: str   # HH:MM or HH:MM:SS
    max_volunteers: int = Field(default=10, ge=1)

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    max_volunteers: Optional[int] = None
    status: Optional[str] = None

class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    location: str
    event_date: str
    start_time: str
    end_time: str
    max_volunteers: int
    status: str
    created_by: Optional[int] = None
    created_at: datetime
    assigned_count: Optional[int] = 0
    is_assigned: Optional[bool] = False

# --- Assignment Schemas ---
class AssignmentCreate(BaseModel):
    event_id: int
    volunteer_id: int

class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    volunteer_id: int
    status: str
    assigned_at: datetime
    event_name: Optional[str] = None
    event_date: Optional[str] = None
    location: Optional[str] = None
    volunteer_name: Optional[str] = None
    volunteer_email: Optional[str] = None

# --- Attendance Schemas ---
class AttendanceCheckIn(BaseModel):
    event_id: int
    notes: Optional[str] = Field(default=None, max_length=500)

class AttendanceCheckOut(BaseModel):
    attendance_id: int
    notes: Optional[str] = Field(default=None, max_length=1000)

class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    event_name: str
    volunteer_id: int
    volunteer_name: str
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    hours_worked: float
    status: str
    notes: Optional[str] = None

# --- Dashboard & Report Schemas ---
class DashboardStats(BaseModel):
    total_volunteers: int
    active_volunteers: int
    pending_volunteers: int
    total_events: int
    total_hours: float
    attendance_rate: float
