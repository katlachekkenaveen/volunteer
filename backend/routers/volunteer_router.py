from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Event, EventAssignment, UserStatus, EventStatus
from backend.schemas import EventResponse, AssignmentResponse
from backend.auth import get_current_approved_user

router = APIRouter(prefix="/api/volunteer", tags=["Volunteer Operations"])

@router.get("/events", response_model=List[EventResponse])
def get_volunteer_events(
    current_user: User = Depends(get_current_approved_user),
    db: Session = Depends(get_db)
):
    events = db.query(Event).filter(Event.status != EventStatus.CANCELLED.value).order_by(Event.event_date.asc()).all()
    
    # Get IDs of events user is assigned to
    user_assignments = db.query(EventAssignment.event_id).filter(EventAssignment.volunteer_id == current_user.id).all()
    assigned_event_ids = {a[0] for a in user_assignments}

    result = []
    for ev in events:
        count = db.query(EventAssignment).filter(EventAssignment.event_id == ev.id).count()
        res = EventResponse.from_orm(ev)
        res.assigned_count = count
        res.is_assigned = ev.id in assigned_event_ids
        result.append(res)
        
    return result

@router.get("/my-assignments", response_model=List[AssignmentResponse])
def get_my_assignments(
    current_user: User = Depends(get_current_approved_user),
    db: Session = Depends(get_db)
):
    assignments = db.query(EventAssignment)\
                    .filter(EventAssignment.volunteer_id == current_user.id)\
                    .order_by(EventAssignment.assigned_at.desc()).all()
    
    res = []
    for a in assignments:
        ev = db.query(Event).filter(Event.id == a.event_id).first()
        if ev:
            res.append(AssignmentResponse(
                id=a.id,
                event_id=a.event_id,
                volunteer_id=a.volunteer_id,
                status=a.status,
                assigned_at=a.assigned_at,
                event_name=ev.name,
                event_date=ev.event_date,
                location=ev.location,
                volunteer_name=current_user.name,
                volunteer_email=current_user.email
            ))
    return res

@router.post("/events/{event_id}/join", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
def join_event(
    event_id: int,
    current_user: User = Depends(get_current_approved_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    # Check capacity
    current_count = db.query(EventAssignment).filter(EventAssignment.event_id == event.id).count()
    if current_count >= event.max_volunteers:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is already full.")

    # Check if already assigned
    existing = db.query(EventAssignment).filter(
        EventAssignment.event_id == event_id,
        EventAssignment.volunteer_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already assigned to this event.")

    new_assign = EventAssignment(
        event_id=event_id,
        volunteer_id=current_user.id,
        status="confirmed"
    )
    db.add(new_assign)
    db.commit()
    db.refresh(new_assign)

    return AssignmentResponse(
        id=new_assign.id,
        event_id=event.id,
        volunteer_id=current_user.id,
        status=new_assign.status,
        assigned_at=new_assign.assigned_at,
        event_name=event.name,
        event_date=event.event_date,
        location=event.location,
        volunteer_name=current_user.name,
        volunteer_email=current_user.email
    )
