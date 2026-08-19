from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.database import get_db
from backend.models import User, Event, Attendance, AttendanceStatus, UserRole
from backend.schemas import AttendanceCheckIn, AttendanceCheckOut, AttendanceResponse
from backend.auth import get_current_user, get_current_approved_user

router = APIRouter(prefix="/api/attendance", tags=["Attendance & Hours"])

def format_attendance_response(att: Attendance, db: Session) -> AttendanceResponse:
    ev = db.query(Event).filter(Event.id == att.event_id).first()
    vol = db.query(User).filter(User.id == att.volunteer_id).first()
    return AttendanceResponse(
        id=att.id,
        event_id=att.event_id,
        event_name=ev.name if ev else "Unknown Event",
        volunteer_id=att.volunteer_id,
        volunteer_name=vol.name if vol else "Unknown Volunteer",
        check_in_time=att.check_in_time,
        check_out_time=att.check_out_time,
        hours_worked=att.hours_worked,
        status=att.status,
        notes=att.notes
    )

@router.post("/check-in", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def check_in(
    data: AttendanceCheckIn,
    current_user: User = Depends(get_current_approved_user),
    db: Session = Depends(get_db)
):
    # Verify event exists
    event = db.query(Event).filter(Event.id == data.event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    # Check if volunteer already has an active check-in
    active = db.query(Attendance).filter(
        Attendance.volunteer_id == current_user.id,
        Attendance.status == AttendanceStatus.CHECKED_IN.value
    ).first()

    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active check-in shift. Please check out first."
        )

    new_attendance = Attendance(
        event_id=data.event_id,
        volunteer_id=current_user.id,
        check_in_time=datetime.utcnow(),
        status=AttendanceStatus.CHECKED_IN.value,
        notes=data.notes
    )
    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)

    return format_attendance_response(new_attendance, db)

@router.post("/check-out", response_model=AttendanceResponse)
def check_out(
    data: AttendanceCheckOut,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attendance = db.query(Attendance).filter(Attendance.id == data.attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found.")

    # Only volunteer themselves or Admin can check out
    if current_user.role != UserRole.ADMIN.value and attendance.volunteer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

    if attendance.status == AttendanceStatus.COMPLETED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shift has already been checked out.")

    check_out_dt = datetime.utcnow()
    attendance.check_out_time = check_out_dt
    
    # Calculate hours worked automatically
    duration_seconds = (check_out_dt - attendance.check_in_time).total_seconds()
    # Enforce minimum 0.05 hr (3 mins) for test / quick checkouts or exact float calculation
    hours = max(0.05, round(duration_seconds / 3600.0, 2))
    
    attendance.hours_worked = hours
    attendance.status = AttendanceStatus.COMPLETED.value
    if data.notes:
        attendance.notes = (attendance.notes or "") + f" | Out Notes: {data.notes}"

    db.commit()
    db.refresh(attendance)

    return format_attendance_response(attendance, db)

@router.get("/active", response_model=Optional[AttendanceResponse])
def get_active_shift(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    active = db.query(Attendance).filter(
        Attendance.volunteer_id == current_user.id,
        Attendance.status == AttendanceStatus.CHECKED_IN.value
    ).first()

    if not active:
        return None
    return format_attendance_response(active, db)

@router.get("/history", response_model=List[AttendanceResponse])
def get_attendance_history(
    volunteer_id: Optional[int] = None,
    event_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Attendance)

    # If volunteer, can only view their own history
    if current_user.role == UserRole.VOLUNTEER.value:
        query = query.filter(Attendance.volunteer_id == current_user.id)
    elif volunteer_id:
        query = query.filter(Attendance.volunteer_id == volunteer_id)

    if event_id:
        query = query.filter(Attendance.event_id == event_id)

    records = query.order_by(Attendance.check_in_time.desc()).all()
    return [format_attendance_response(att, db) for att in records]
