import csv
import io
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import User, Event, EventAssignment, Attendance, UserRole, UserStatus, EventStatus
from backend.schemas import DashboardStats
from backend.auth import get_current_admin

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])

@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_metrics(
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_volunteers = db.query(User).filter(User.role == UserRole.VOLUNTEER.value).count()
    active_volunteers = db.query(User).filter(
        User.role == UserRole.VOLUNTEER.value,
        User.status == UserStatus.APPROVED.value
    ).count()
    pending_volunteers = db.query(User).filter(
        User.role == UserRole.VOLUNTEER.value,
        User.status == UserStatus.PENDING.value
    ).count()

    total_events = db.query(Event).count()

    tot_hours = db.query(func.sum(Attendance.hours_worked))\
                  .filter(Attendance.status == "completed")\
                  .scalar()
    total_hours = round(float(tot_hours), 2) if tot_hours else 0.0

    total_assignments = db.query(EventAssignment).count()
    completed_attendance = db.query(Attendance).filter(Attendance.status == "completed").count()

    attendance_rate = round((completed_attendance / total_assignments * 100.0), 1) if total_assignments > 0 else 100.0

    return DashboardStats(
        total_volunteers=total_volunteers,
        active_volunteers=active_volunteers,
        pending_volunteers=pending_volunteers,
        total_events=total_events,
        total_hours=total_hours,
        attendance_rate=attendance_rate
    )

@router.get("/charts")
def get_chart_data(
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # 1. Monthly hours calculation (last 6 months simulation/aggregation)
    events = db.query(Event).all()
    event_hours: Dict[str, float] = {}
    for ev in events:
        hrs = db.query(func.sum(Attendance.hours_worked))\
                .filter(Attendance.event_id == ev.id, Attendance.status == "completed")\
                .scalar() or 0.0
        event_hours[ev.name] = round(float(hrs), 2)

    # 2. Skills Distribution
    volunteers = db.query(User).filter(User.role == UserRole.VOLUNTEER.value).all()
    skills_count: Dict[str, int] = {}
    for vol in volunteers:
        if vol.skills:
            for s in vol.skills.split(','):
                skill = s.strip()
                if skill:
                    skills_count[skill] = skills_count.get(skill, 0) + 1

    return {
        "event_hours": event_hours,
        "skills_distribution": skills_count
    }

@router.get("/export/volunteers/csv")
def export_volunteers_csv(
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    volunteers = db.query(User).filter(User.role == UserRole.VOLUNTEER.value).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Phone", "Status", "Skills", "Availability", "Total Hours Worked", "Registration Date"])

    for vol in volunteers:
        tot_hrs = db.query(func.sum(Attendance.hours_worked))\
                    .filter(Attendance.volunteer_id == vol.id, Attendance.status == "completed")\
                    .scalar() or 0.0
        writer.writerow([
            vol.id,
            vol.name,
            vol.email,
            vol.phone,
            vol.status,
            vol.skills or "",
            vol.availability or "",
            round(float(tot_hrs), 2),
            vol.created_at.strftime("%Y-%m-%d")
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=volunteer_report.csv"}
    )

@router.get("/export/attendance/csv")
def export_attendance_csv(
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    records = db.query(Attendance).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Attendance ID", "Event Name", "Volunteer Name", "Check-In Time", "Check-Out Time", "Hours Worked", "Status", "Notes"])

    for att in records:
        ev = db.query(Event).filter(Event.id == att.event_id).first()
        vol = db.query(User).filter(User.id == att.volunteer_id).first()
        writer.writerow([
            att.id,
            ev.name if ev else "N/A",
            vol.name if vol else "N/A",
            att.check_in_time.strftime("%Y-%m-%d %H:%M:%S") if att.check_in_time else "",
            att.check_out_time.strftime("%Y-%m-%d %H:%M:%S") if att.check_out_time else "",
            att.hours_worked,
            att.status,
            att.notes or ""
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_hours_report.csv"}
    )
