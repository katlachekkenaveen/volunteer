from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=20)
    password: str = Field(..., min_length=6)
    skills: Optional[str] = None
    availability: Optional[str] = None
    bio: Optional[str] = None

class AdminRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    admin_key: str = Field(..., min_length=1)
    phone: Optional[str] = "+1 555-0100"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
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

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserStatusUpdate(BaseModel):
    status: str # 'approved', 'rejected', 'pending'

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    skills: Optional[str] = None
    availability: Optional[str] = None
    bio: Optional[str] = None

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

    class Config:
        from_attributes = True

# --- Assignment Schemas ---
class AssignmentCreate(BaseModel):
    event_id: int
    volunteer_id: int

class AssignmentResponse(BaseModel):
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

    class Config:
        from_attributes = True

# --- Attendance Schemas ---
class AttendanceCheckIn(BaseModel):
    event_id: int
    notes: Optional[str] = None

class AttendanceCheckOut(BaseModel):
    attendance_id: int
    notes: Optional[str] = None

class AttendanceResponse(BaseModel):
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

    class Config:
        from_attributes = True

# --- Dashboard & Report Schemas ---
class DashboardStats(BaseModel):
    total_volunteers: int
    active_volunteers: int
    pending_volunteers: int
    total_events: int
    total_hours: float
    attendance_rate: float
