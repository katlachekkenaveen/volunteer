import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure volunteer root is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, engine, Base
from backend.models import User, Event, EventAssignment, Attendance, UserRole, UserStatus, EventStatus, AssignmentStatus, AttendanceStatus
from backend.auth import hash_password

def seed_data():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if admin already exists
    admin = db.query(User).filter(User.email == "admin@volunteermsg.org").first()
    if not admin:
        print("Seeding Admin user...")
        admin = User(
            name="System Administrator",
            email="admin@volunteermsg.org",
            phone="+1 555-0100",
            password_hash=hash_password("admin123"),
            role=UserRole.ADMIN.value,
            status=UserStatus.APPROVED.value,
            skills="Management, Event Coordination, Logistics",
            availability="Full-time",
            bio="Lead administrator for the Volunteer Management System."
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    # Seed Sample Volunteers
    vols_data = [
        {
            "name": "Sarah Jenkins",
            "email": "sarah.j@example.com",
            "phone": "+1 555-0101",
            "password": "password123",
            "status": UserStatus.APPROVED.value,
            "skills": "First Aid, Teaching, Event Support",
            "availability": "Weekends",
            "bio": "Passionate community organizer and certified first responder."
        },
        {
            "name": "Michael Chen",
            "email": "m.chen@example.com",
            "phone": "+1 555-0102",
            "password": "password123",
            "status": UserStatus.APPROVED.value,
            "skills": "Food Preparation, Logistics, Driving",
            "availability": "Evenings & Weekends",
            "bio": "Dedicated volunteer focused on food security and logistics support."
        },
        {
            "name": "Emily Davis",
            "email": "emily.davis@example.com",
            "phone": "+1 555-0103",
            "password": "password123",
            "status": UserStatus.PENDING.value,
            "skills": "Social Media, Photography, Graphic Design",
            "availability": "Flexible",
            "bio": "Eager to help with public relations and digital media for upcoming charity events."
        },
        {
            "name": "David Wilson",
            "email": "david.w@example.com",
            "phone": "+1 555-0104",
            "password": "password123",
            "status": UserStatus.PENDING.value,
            "skills": "Construction, Carpentry, Heavy Lifting",
            "availability": "Weekdays",
            "bio": "Experienced carpenter looking to help with community building initiatives."
        }
    ]

    vol_objs = []
    for vd in vols_data:
        existing = db.query(User).filter(User.email == vd["email"]).first()
        if not existing:
            v = User(
                name=vd["name"],
                email=vd["email"],
                phone=vd["phone"],
                password_hash=hash_password(vd["password"]),
                role=UserRole.VOLUNTEER.value,
                status=vd["status"],
                skills=vd["skills"],
                availability=vd["availability"],
                bio=vd["bio"]
            )
            db.add(v)
            db.commit()
            db.refresh(v)
            vol_objs.append(v)
        else:
            vol_objs.append(existing)

    # Seed Sample Events
    events_data = [
        {
            "name": "City Park Spring Clean-up",
            "description": "Join us in cleaning up Central Park, planting native flowers, and restoring community garden beds.",
            "location": "Central Park Pavilion, 45th Street",
            "event_date": "2026-09-05",
            "start_time": "09:00:00",
            "end_time": "13:00:00",
            "max_volunteers": 15,
            "status": EventStatus.UPCOMING.value
        },
        {
            "name": "Community Food Pantry Drive",
            "description": "Sorting food donations, packing care bundles, and assisting families at the community food bank.",
            "location": "St. Mary Community Center, Hall B",
            "event_date": "2026-09-12",
            "start_time": "10:00:00",
            "end_time": "14:00:00",
            "max_volunteers": 10,
            "status": EventStatus.UPCOMING.value
        },
        {
            "name": "Youth Coding & Literacy Workshop",
            "description": "Mentoring middle school students in basic computer skills and reading comprehension.",
            "location": "Downtown Public Library, Room 302",
            "event_date": "2026-08-25",
            "start_time": "14:00:00",
            "end_time": "17:00:00",
            "max_volunteers": 6,
            "status": EventStatus.UPCOMING.value
        }
    ]

    event_objs = []
    for ed in events_data:
        existing = db.query(Event).filter(Event.name == ed["name"]).first()
        if not existing:
            ev = Event(
                name=ed["name"],
                description=ed["description"],
                location=ed["location"],
                event_date=ed["event_date"],
                start_time=ed["start_time"],
                end_time=ed["end_time"],
                max_volunteers=ed["max_volunteers"],
                status=ed["status"],
                created_by=admin.id
            )
            db.add(ev)
            db.commit()
            db.refresh(ev)
            event_objs.append(ev)
        else:
            event_objs.append(existing)

    # Seed Sample Assignments
    if len(event_objs) >= 2 and len(vol_objs) >= 2:
        a1 = db.query(EventAssignment).filter(EventAssignment.event_id == event_objs[0].id, EventAssignment.volunteer_id == vol_objs[0].id).first()
        if not a1:
            db.add(EventAssignment(event_id=event_objs[0].id, volunteer_id=vol_objs[0].id, status=AssignmentStatus.CONFIRMED.value))
        
        a2 = db.query(EventAssignment).filter(EventAssignment.event_id == event_objs[0].id, EventAssignment.volunteer_id == vol_objs[1].id).first()
        if not a2:
            db.add(EventAssignment(event_id=event_objs[0].id, volunteer_id=vol_objs[1].id, status=AssignmentStatus.CONFIRMED.value))

        a3 = db.query(EventAssignment).filter(EventAssignment.event_id == event_objs[1].id, EventAssignment.volunteer_id == vol_objs[0].id).first()
        if not a3:
            db.add(EventAssignment(event_id=event_objs[1].id, volunteer_id=vol_objs[0].id, status=AssignmentStatus.ASSIGNED.value))

        db.commit()

    # Seed Sample Attendance Records
    if len(event_objs) >= 1 and len(vol_objs) >= 2:
        att_exists = db.query(Attendance).count()
        if att_exists == 0:
            att1 = Attendance(
                event_id=event_objs[0].id,
                volunteer_id=vol_objs[0].id,
                check_in_time=datetime.now(timezone.utc) - timedelta(days=2, hours=4),
                check_out_time=datetime.now(timezone.utc) - timedelta(days=2),
                hours_worked=4.0,
                status=AttendanceStatus.COMPLETED.value,
                notes="Worked on garden bed restoration and planting."
            )
            att2 = Attendance(
                event_id=event_objs[0].id,
                volunteer_id=vol_objs[1].id,
                check_in_time=datetime.now(timezone.utc) - timedelta(days=2, hours=3, minutes=30),
                check_out_time=datetime.now(timezone.utc) - timedelta(days=2),
                hours_worked=3.5,
                status=AttendanceStatus.COMPLETED.value,
                notes="Assisted with heavy lifting and equipment transport."
            )
            db.add_all([att1, att2])
            db.commit()

    print("Data seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_data()
