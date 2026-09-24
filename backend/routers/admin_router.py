from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from backend.database import get_db
from backend.models import User, Event, EventAssignment, Attendance, UserRole, UserStatus, EventStatus
from backend.schemas import (
    UserResponse, UserStatusUpdate, EventCreate, EventUpdate, EventResponse,
    AssignmentCreate, AssignmentResponse
)
from backend.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Operations"])

# --- Volunteer Management ---
@router.get("/volunteers", response_model=List[UserResponse])
def get_volunteers(
    status: Optional[str] = None,
    search: Optional[str] = None,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.role == UserRole.VOLUNTEER.value)
    
    if status and status.lower() != "all":
        query = query.filter(User.status == status.lower())
    
    if search:
        # Sanitize search term by escaping SQL LIKE wildcards
        clean_search = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")[:100]
        search_term = f"%{clean_search}%"
        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term),
                User.skills.ilike(search_term),
                User.phone.ilike(search_term)
            )
        )
    
    volunteers = query.order_by(User.created_at.desc()).all()
    
    result = []
    for vol in volunteers:
        tot_hrs = db.query(func.sum(Attendance.hours_worked))\
                    .filter(Attendance.volunteer_id == vol.id, Attendance.status == "completed")\
                    .scalar()
        res = UserResponse.model_validate(vol)
        res.total_hours = round(float(tot_hrs), 2) if tot_hrs else 0.0
        result.append(res)
    
    return result

@router.put("/volunteers/{volunteer_id}/status", response_model=UserResponse)
def update_volunteer_status(
    volunteer_id: int,
    status_update: UserStatusUpdate,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    volunteer = db.query(User).filter(User.id == volunteer_id, User.role == UserRole.VOLUNTEER.value).first()
    if not volunteer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer not found.")
    
    valid_statuses = [UserStatus.PENDING.value, UserStatus.APPROVED.value, UserStatus.REJECTED.value]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Must be one of {valid_statuses}")
    
    volunteer.status = status_update.status
    db.commit()
    db.refresh(volunteer)

    tot_hrs = db.query(func.sum(Attendance.hours_worked))\
                .filter(Attendance.volunteer_id == volunteer.id, Attendance.status == "completed")\
                .scalar()
    res = UserResponse.model_validate(volunteer)
    res.total_hours = round(float(tot_hrs), 2) if tot_hrs else 0.0
    return res

@router.delete("/volunteers/{volunteer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_volunteer(
    volunteer_id: int,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    volunteer = db.query(User).filter(User.id == volunteer_id, User.role == UserRole.VOLUNTEER.value).first()
    if not volunteer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer not found.")
    
    db.delete(volunteer)
    db.commit()
    return None

# --- Event Management ---
@router.get("/events", response_model=List[EventResponse])
def get_all_events(
    status: Optional[str] = None,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Event)
    if status and status.lower() != "all":
        query = query.filter(Event.status == status.lower())
    
    events = query.order_by(Event.event_date.asc()).all()
    
    result = []
    for ev in events:
        count = db.query(EventAssignment).filter(EventAssignment.event_id == ev.id).count()
        res = EventResponse.model_validate(ev)
        res.assigned_count = count
        result.append(res)
    return result

@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    event_data: EventCreate,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    new_event = Event(
        name=event_data.name.strip(),
        description=event_data.description,
        location=event_data.location.strip(),
        event_date=event_data.event_date,
        start_time=event_data.start_time,
        end_time=event_data.end_time,
        max_volunteers=event_data.max_volunteers,
        status=EventStatus.UPCOMING.value,
        created_by=admin_user.id
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    res = EventResponse.model_validate(new_event)
    res.assigned_count = 0
    return res

@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    event_data: EventUpdate,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    if event_data.name is not None:
        event.name = event_data.name.strip()
    if event_data.description is not None:
        event.description = event_data.description
    if event_data.location is not None:
        event.location = event_data.location.strip()
    if event_data.event_date is not None:
        event.event_date = event_data.event_date
    if event_data.start_time is not None:
        event.start_time = event_data.start_time
    if event_data.end_time is not None:
        event.end_time = event_data.end_time
    if event_data.max_volunteers is not None:
        event.max_volunteers = event_data.max_volunteers
    if event_data.status is not None:
        event.status = event_data.status

    db.commit()
    db.refresh(event)

    count = db.query(EventAssignment).filter(EventAssignment.event_id == event.id).count()
    res = EventResponse.model_validate(event)
    res.assigned_count = count
    return res

@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    
    db.delete(event)
    db.commit()
    return None

# --- Event Assignments ---
@router.post("/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_volunteer_to_event(
    data: AssignmentCreate,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Verify event exists
    event = db.query(Event).filter(Event.id == data.event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    # Verify volunteer exists and is approved
    volunteer = db.query(User).filter(User.id == data.volunteer_id, User.role == UserRole.VOLUNTEER.value).first()
    if not volunteer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer not found.")
    if volunteer.status != UserStatus.APPROVED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only approved volunteers can be assigned to events.")

    # Check capacity
    current_count = db.query(EventAssignment).filter(EventAssignment.event_id == event.id).count()
    if current_count >= event.max_volunteers:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event has reached maximum volunteer capacity.")

    # Check existing assignment
    existing = db.query(EventAssignment).filter(
        EventAssignment.event_id == data.event_id,
        EventAssignment.volunteer_id == data.volunteer_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Volunteer is already assigned to this event.")

    from sqlalchemy.exc import IntegrityError

    new_assign = EventAssignment(
        event_id=data.event_id,
        volunteer_id=data.volunteer_id,
        status="assigned"
    )
    db.add(new_assign)
    try:
        db.commit()
        db.refresh(new_assign)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This volunteer is already assigned to this event."
        )

    return AssignmentResponse(
        id=new_assign.id,
        event_id=event.id,
        volunteer_id=volunteer.id,
        status=new_assign.status,
        assigned_at=new_assign.assigned_at,
        event_name=event.name,
        event_date=event.event_date,
        location=event.location,
        volunteer_name=volunteer.name,
        volunteer_email=volunteer.email
    )

@router.get("/assignments", response_model=List[AssignmentResponse])
def get_all_assignments(
    event_id: Optional[int] = None,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(EventAssignment)
    if event_id:
        query = query.filter(EventAssignment.event_id == event_id)
    
    assignments = query.order_by(EventAssignment.assigned_at.desc()).all()
    
    res = []
    for a in assignments:
        ev = db.query(Event).filter(Event.id == a.event_id).first()
        vol = db.query(User).filter(User.id == a.volunteer_id).first()
        res.append(AssignmentResponse(
            id=a.id,
            event_id=a.event_id,
            volunteer_id=a.volunteer_id,
            status=a.status,
            assigned_at=a.assigned_at,
            event_name=ev.name if ev else "Unknown Event",
            event_date=ev.event_date if ev else "",
            location=ev.location if ev else "",
            volunteer_name=vol.name if vol else "Unknown Volunteer",
            volunteer_email=vol.email if vol else ""
        ))
    return res

@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_assignment(
    assignment_id: int,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    assignment = db.query(EventAssignment).filter(EventAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    
    db.delete(assignment)
    db.commit()
    return None
