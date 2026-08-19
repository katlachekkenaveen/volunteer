# 🤝 Volunteer Management & Scheduling System

A full-stack, professional **Volunteer Management and Scheduling System** built with **FastAPI (Python)**, **MySQL / SQLite**, **HTML5/CSS3/JavaScript (ES6)**, **Bootstrap 5**, and **Chart.js**.

---

## 🌟 Key Features & Modules

### 1. 📝 Volunteer Registration & Authentication
* Public registration form capturing Name, Email, Phone, Skills, Availability, Password, and Bio.
* Role-Based Access Control (RBAC) with JWT Bearer tokens (`admin` vs. `volunteer`).
* Registration verification workflow (`pending` -> `approved` / `rejected`).

### 2. 🛡️ Admin Dashboard & Verification Queue
* **Live Overview**: High-level stat cards (Total Volunteers, Active Volunteers, Total Events, Total Working Hours).
* **Verification Queue**: Review pending volunteer applications, inspect skills, and click to approve or reject.
* **Volunteer Directory**: Search and filter registered volunteers by status or skill; view individual hours worked.
* **Event Management**: Create, edit, and delete events (Name, Location, Date, Time Range, Max Volunteers Capacity).
* **Event Assignment**: Assign approved volunteers to scheduled events.

### 3. 📅 Volunteer Portal & Self-Service
* Personal dashboard displaying assigned upcoming events, event capacity, and total hours contributed.
* Event browsing and self-registration (`Join Event`).
* Volunteer profile management (update skills, phone, availability, and bio).

### 4. ⏱️ Real-Time Shift Timer & Automatic Hours Calculation
* One-click **Check-In** for active event shifts with optional arrival notes.
* Live **elapsed time clock** (`HH:MM:SS`) on the volunteer dashboard during active shifts.
* **Check-Out** automatically calculates total working hours (`hours_worked = (check_out - check_in)` in decimal hours).
* Complete, audit-ready attendance history logs for volunteers and admins.

### 5. 📊 Reports, Analytics & Data Export
* Interactive visual charts (Monthly Hours by Event, Skills Distribution).
* Downloadable **CSV Reports** for Volunteer Directories and Attendance Hours logs (`/api/reports/export/...`).

---

## 🏗️ System Architecture & Technology Stack

* **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphism Design System), JavaScript (ES6 Fetch API), Bootstrap 5.3, Bootstrap Icons, Chart.js.
* **Backend**: Python 3.14 + FastAPI + Pydantic v2 + SQLAlchemy ORM + PyJWT + Passlib + Uvicorn.
* **Database**: MySQL (compatible `backend/schema.sql` included) with zero-configuration **SQLite auto-fallback** (`volunteers.db`) for instant local testing.

---

## 🚀 Getting Started & Local Installation Guide

### Prerequisites
* Python 3.10+ installed
* MySQL Server (Optional, SQLite is enabled out-of-the-box for instant zero-setup execution)

### 1. Clone & Set Up Project Environment

```bash
# Navigate to project directory
cd voluenteer

# Create a virtual environment (optional but recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Configure Environment (Optional)

Create or adjust `.env` file (a template is provided in `.env.example`):

```ini
# For SQLite (Default):
DATABASE_URL=sqlite:///./volunteers.db

# For MySQL:
# DATABASE_URL=mysql+pymysql://username:password@localhost:3306/volunteer_db

SECRET_KEY=super-secret-jwt-key-change-in-production-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### 3. Seed Sample Database Data

Run the seeding script to populate the initial Admin account, sample volunteers, upcoming events, assignments, and attendance logs:

```bash
python -m backend.seed
```

### 4. Launch the Application

Start the FastAPI application with Uvicorn:

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Access the application in your browser:
* **Landing Page**: `http://127.0.0.1:8000/`
* **Login / Register**: `http://127.0.0.1:8000/login`
* **Admin Dashboard**: `http://127.0.0.1:8000/admin`
* **Volunteer Portal**: `http://127.0.0.1:8000/volunteer`
* **Interactive API Docs (OpenAPI / Swagger)**: `http://127.0.0.1:8000/docs`

---

## 🔑 Demo Credentials

| Role | Email | Password | Access / Functionality |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@volunteermsg.org` | `admin123` | Full access to verification, volunteer directory, event CRUD, assignments, and CSV exports. |
| **Volunteer (Approved)** | `sarah.j@example.com` | `password123` | Access to assigned events, live shift check-in/out timer, and personal hours log. |
| **Volunteer (Pending)** | `emily.davis@example.com` | `password123` | Demonstrates pending verification alert state. |

---

## 📂 Project Structure

```
voluenteer/
├── backend/
│   ├── main.py                  # FastAPI application setup & static serving
│   ├── database.py              # SQLAlchemy engine & session maker
│   ├── models.py                # Database models (User, Event, Assignment, Attendance)
│   ├── schemas.py               # Pydantic validation & response schemas
│   ├── auth.py                  # JWT authentication & security dependencies
│   ├── seed.py                  # Database seed script for initial testing data
│   ├── schema.sql               # Pure MySQL DDL & DML script
│   └── routers/
│       ├── auth_router.py       # Login, Register, Profile endpoints
│       ├── admin_router.py      # Verification, Event CRUD, Assignments
│       ├── volunteer_router.py  # Event browsing, Self-join endpoints
│       ├── attendance_router.py # Check-in, Check-out, Live timer
│       └── reports_router.py    # Analytics metrics & CSV report generation
├── frontend/
│   ├── index.html               # Public Landing page
│   ├── login.html               # Login & Volunteer Registration portal
│   ├── admin_dashboard.html     # Admin Management Portal
│   ├── volunteer_dashboard.html # Volunteer Portal & Shift Tracker
│   ├── css/
│   │   └── styles.css           # Glassmorphic CSS design system & responsive styling
│   └── js/
│       ├── api.js               # Centralized REST API client & toasts
│       ├── auth.js              # Auth & session management
│       ├── admin.js             # Admin dashboard controller
│       ├── volunteer.js         # Volunteer portal & live shift timer controller
│       └── reports.js           # Analytics charts & CSV exports
├── .env.example                 # Environment variable sample configuration
├── requirements.txt             # Python dependencies
└── README.md                    # Project documentation
```

---

## 🐙 Git & GitHub Push Commands

To push this repository to GitHub:

```bash
git init
git add .
git commit -m "Initial commit: Volunteer Management and Scheduling System"
git branch -M main
git remote add origin https://github.com/your-username/volunteer-management-system.git
git push -u origin main
```
