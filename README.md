# 🤝 VolunteerConnect - Volunteer Management & Scheduling System

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red.svg)](https://www.sqlalchemy.org/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)](https://getbootstrap.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**VolunteerConnect** is an enterprise-ready, full-stack Volunteer Management & Scheduling platform designed to modernize community outreach. It streamlines volunteer onboarding, administrative verification, event assignment, sub-second live shift time tracking, and automated audit-ready reporting.

---

## 📑 Table of Contents
- [Key Features & Modules](#-key-features--modules)
- [System Architecture](#-system-architecture)
- [Security Hardening & Best Practices](#-security-hardening--best-practices)
- [Tech Stack](#-tech-stack)
- [Quick Start Guide](#-quick-start-guide)
- [Demo Credentials](#-demo-credentials)
- [API Documentation](#-api-documentation)
- [Project Directory Structure](#-project-directory-structure)
- [License & Authors](#-license--authors)

---

## 🌟 Key Features & Modules

### 1. 🛡️ Administrative Portal
* **Real-time Overview Metrics**: Instant visualization of registered volunteers, active/approved members, upcoming events, and cumulative service hours.
* **Verification Queue**: Review incoming volunteer applications with a single click to approve or reject.
* **Volunteer Directory**: Search volunteers by name, email, or skill keywords with status filters (All, Approved, Pending, Rejected).
* **Event Management (CRUD)**: Create, schedule, edit, and cancel events with max volunteer capacity caps and location mapping.
* **Roster Assignments**: Assign vetted volunteers directly to scheduled event rosters.
* **Auditing & Analytics**: Export clean, sanitized CSV reports for volunteer rosters and attendance logs.

### 2. ⏱️ Volunteer Self-Service & Live Shift Tracker
* **One-Click Quick Check-In**: Start shift time tracking directly from the dashboard banner or assigned event cards.
* **Live Shift Stopwatch**: Real-time ticker (`HH:MM:SS`) derived from UTC server timestamps with automatic timezone normalization.
* **Interactive Check-Out Modal**: End shifts with optional completion notes; automatically calculates decimal working hours.
* **Event Self-Registration**: Browse open community opportunities with live capacity indicators (e.g. `2/15 spots filled`) and join in one click.
* **Personal Attendance Ledger**: Transparent history of all completed shifts with check-in/out timestamps and total hours earned.
* **Profile Settings**: Update contact details, availability, and skills.

### 3. 🎨 Animated Public Landing Page
* **Hero Section**: Modern glassmorphic layout highlighting organizational impact.
* **System Process Flow**: Animated workflow beam connecting the 4 key stages: *Registration &rarr; Verification &rarr; Event Assignment &rarr; Hours & Reports*.
* **Featured Events**: Public preview of upcoming community projects with direct registration links.

---

## 🏗️ System Architecture

```
+-------------------------------------------------------------------------+
|                              Client Layer                               |
|   - Responsive Glassmorphic UI (HTML5, Bootstrap 5.3, Plus Jakarta)     |
|   - Dynamic Controllers (Vanilla JS ES6 Modules, Fetch API)             |
|   - Real-time Active Shift Timer & Dynamic Tab Switchers                |
+------------------------------------+------------------------------------+
                                     |  HTTP/JSON (REST API)
                                     v
+-------------------------------------------------------------------------+
|                              Server Layer                               |
|   - FastAPI (Asynchronous Python 3.12 Web Framework)                    |
|   - Security Middleware (CORS Whitelist, Defense-in-Depth Headers)      |
|   - JWT (JSON Web Tokens) with PBKDF2-SHA256 & Bcrypt Password Hashing  |
|   - Modular Routers: Auth, Admin, Volunteer, Attendance, Reports        |
+------------------------------------+------------------------------------+
                                     |  SQLAlchemy 2.0 ORM
                                     v
+-------------------------------------------------------------------------+
|                             Database Layer                              |
|   - SQLite / MySQL Relational Architecture                              |
|   - Foreign Key Cascades & Unique Constraints                           |
|   - Automated Transaction Integrity & Rollbacks                         |
+-------------------------------------------------------------------------+
```

---

## 🔒 Security Hardening & Best Practices

The codebase has undergone security review and defense-in-depth hardening:

- **Timing Attack Mitigation**: Secret admin registration keys are compared using constant-time `hmac.compare_digest()`.
- **Password Complexity**: Enforced minimum 8 characters with alphanumeric requirements (`[a-zA-Z]` + `[0-9]`) validated on backend schemas and frontend forms.
- **CSV Formula Injection (DDE)**: Exported spreadsheets escape leading formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with single quotes via `sanitize_csv_field()`.
- **SQL LIKE Sanitization**: Wildcard characters (`%`, `_`, `\`) in admin searches are escaped to prevent search abuse.
- **Concurrency & Race Conditions**: Event capacity enrollment catches database `IntegrityError` with clean transaction rollbacks.
- **Restricted CORS & Security Headers**: Injected headers including `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy`.
- **Client-Side Tampering Defense**: Protected dashboard routes verify session tokens live against `/api/auth/me` on load.

---

## 💻 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Python 3.10+, FastAPI | High-performance asynchronous REST API framework |
| **ORM & DB** | SQLAlchemy 2.0, SQLite / MySQL | Object-relational mapping with cascade rules |
| **Validation** | Pydantic v2 | Type validation and field constraints |
| **Authentication**| PyJWT, PBKDF2 / Bcrypt | Stateless JWT Bearer tokens and salted hashing |
| **Frontend** | HTML5, Modern CSS3 | Custom glassmorphism design system & micro-animations |
| **UI Framework** | Bootstrap 5.3, Bootstrap Icons | Responsive grid system and interactive modals |
| **Visualizations**| Chart.js | Dynamic analytics charts for hours & skills |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* Python 3.10 or higher installed
* Modern web browser (Chrome, Firefox, Edge, Safari)

### 2. Clone & Setup Virtual Environment
```bash
# Navigate to project root
cd volunteer

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables
A sample `.env` file is automatically generated. You can customize `.env`:
```ini
DATABASE_URL=sqlite:///./volunteers.db
SECRET_KEY=volunteer-jwt-production-secret-98dfb841a2e9b17793d5
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ADMIN_REGISTRATION_KEY=AdminPortalSecretKey2026!
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
```

### 4. Initialize Demo Database
Seed the database with sample events, volunteers, and an admin account:
```bash
python -m backend.seed
```

### 5. Launch the Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser to:
* **Landing Page**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
* **Account Sign-In**: [http://127.0.0.1:8000/login.html](http://127.0.0.1:8000/login.html)
* **Interactive API Docs (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🔑 Demo Credentials

| Role | Email | Password | Key Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@volunteermsg.org` | `admin123` | Verification queue, event management, assignments, CSV reports |
| **Approved Volunteer** | `sarah.j@example.com` | `password123` | Scheduled events, live shift timer, attendance logs |
| **Pending Volunteer** | `emily.davis@example.com` | `password123` | Pending review banner demonstration |
| **Admin Registration Key** | — | `AdminPortalSecretKey2026!` | Used to create new admin accounts via `/admin_register.html` |

---

## 📡 API Documentation

The backend serves 18 REST endpoints documented automatically via Swagger UI at `/docs`:

* **Authentication**: `/api/auth/register`, `/api/auth/login`, `/api/auth/admin/register`, `/api/auth/me`, `/api/auth/profile`
* **Volunteer Portals**: `/api/volunteer/events`, `/api/volunteer/my-assignments`, `/api/volunteer/events/{id}/join`
* **Attendance & Time Tracking**: `/api/attendance/check-in`, `/api/attendance/check-out`, `/api/attendance/active`, `/api/attendance/history`
* **Administration**: `/api/admin/volunteers`, `/api/admin/events`, `/api/admin/assignments`
* **Reports**: `/api/reports/dashboard`, `/api/reports/charts`, `/api/reports/export/volunteers/csv`, `/api/reports/export/attendance/csv`

---

## 📂 Project Directory Structure

```text
volunteer/
├── backend/
│   ├── main.py                  # FastAPI application, CORS, static mounts & security headers
│   ├── database.py              # SQLAlchemy database engine & session dependency
│   ├── models.py                # Database models (User, Event, EventAssignment, Attendance)
│   ├── schemas.py               # Pydantic v2 validation & serialization schemas
│   ├── auth.py                  # JWT creation/verification & password hashing utilities
│   ├── seed.py                  # Database seeder with sample accounts & events
│   ├── schema.sql               # MySQL-compatible DDL schema script
│   └── routers/
│       ├── auth_router.py       # Authentication, profile, & registration endpoints
│       ├── admin_router.py      # Verification queue, volunteer directory, event CRUD
│       ├── volunteer_router.py  # Event discovery & self-registration
│       ├── attendance_router.py # Shift check-in, check-out, & UTC timer
│       └── reports_router.py    # Analytics metrics & CSV export streams
├── frontend/
│   ├── index.html               # Public homepage with animated process flow
│   ├── login.html               # Sign-in & volunteer registration portal
│   ├── admin_register.html      # Protected administrator registration view
│   ├── admin_dashboard.html     # Administrative management portal
│   ├── volunteer_dashboard.html # Volunteer portal & interactive shift tracker
│   ├── css/
│   │   └── styles.css           # Glassmorphic UI design tokens & micro-animations
│   └── js/
│       ├── api.js               # Centralized Fetch API client with toast notifications
│       ├── auth.js              # Authentication, session guards, & form handlers
│       ├── admin.js             # Admin dashboard controller & search filters
│       ├── volunteer.js         # Volunteer dashboard, quick check-in modal, & live timer
│       └── reports.js           # Chart.js analytics & CSV export triggers
├── .env                         # Local environment configuration
├── requirements.txt             # Python package dependencies
├── PROJECT_REPORT.md            # Comprehensive engineering architecture report
└── README.md                    # Project documentation & setup guide
```

---

## 📄 License & Authors

Distributed under the **MIT License**. See `LICENSE` for more information.  
Developed for non-profit and community event coordination.
