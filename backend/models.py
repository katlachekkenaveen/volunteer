from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Time, Float, ForeignKey, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from backend.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    VOLUNTEER = "volunteer"

class UserStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class EventStatus(str, enum.Enum):
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class AssignmentStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    CONFIRMED = "confirmed"
    DECLINED = "declined"
    COMPLETED = "completed"

class AttendanceStatus(str, enum.Enum):
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.VOLUNTEER.value, nullable=False)
    status = Column(String(20), default=UserStatus.PENDING.value, nullable=False)
    skills = Column(Text, nullable=True)
    availability = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    assignments = relationship("EventAssignment", back_populates="volunteer", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="volunteer", cascade="all, delete-orphan")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(200), nullable=False)
    event_date = Column(String(10), nullable=False) # YYYY-MM-DD
    start_time = Column(String(8), nullable=False)  # HH:MM:SS
    end_time = Column(String(8), nullable=False)    # HH:MM:SS
    max_volunteers = Column(Integer, default=10)
    status = Column(String(20), default=EventStatus.UPCOMING.value)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    assignments = relationship("EventAssignment", back_populates="event", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="event", cascade="all, delete-orphan")

class EventAssignment(Base):
    __tablename__ = "event_assignments"
    __table_args__ = (UniqueConstraint("event_id", "volunteer_id", name="uq_event_volunteer"),)

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    volunteer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default=AssignmentStatus.ASSIGNED.value)
    assigned_at = Column(DateTime, default=utc_now)

    # Relationships
    event = relationship("Event", back_populates="assignments")
    volunteer = relationship("User", back_populates="assignments")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    volunteer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    check_in_time = Column(DateTime, nullable=False, default=utc_now)
    check_out_time = Column(DateTime, nullable=True)
    hours_worked = Column(Float, default=0.0)
    status = Column(String(20), default=AttendanceStatus.CHECKED_IN.value)
    notes = Column(Text, nullable=True)

    # Relationships
    event = relationship("Event", back_populates="attendance_records")
    volunteer = relationship("User", back_populates="attendance_records")
