import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import engine, Base
from backend.routers import (
    auth_router,
    admin_router,
    volunteer_router,
    attendance_router,
    reports_router
)

# Initialize database tables if not already created
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Volunteer Management & Scheduling System API",
    description="Full-stack REST API for volunteer registration, admin verification, event scheduling, attendance check-in/out, and report generation.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(volunteer_router.router)
app.include_router(attendance_router.router)
app.include_router(reports_router.router)

# Serve Frontend Static Files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/", include_in_schema=False)
    @app.get("/index.html", include_in_schema=False)
    def read_root():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/login", include_in_schema=False)
    @app.get("/login.html", include_in_schema=False)
    def read_login():
        return FileResponse(os.path.join(frontend_dir, "login.html"))

    @app.get("/admin", include_in_schema=False)
    @app.get("/admin.html", include_in_schema=False)
    @app.get("/admin_dashboard.html", include_in_schema=False)
    def read_admin():
        return FileResponse(os.path.join(frontend_dir, "admin_dashboard.html"))

    @app.get("/admin/register", include_in_schema=False)
    @app.get("/admin_register", include_in_schema=False)
    @app.get("/admin_register.html", include_in_schema=False)
    def read_admin_register():
        return FileResponse(os.path.join(frontend_dir, "admin_register.html"))

    @app.get("/volunteer", include_in_schema=False)
    @app.get("/volunteer.html", include_in_schema=False)
    @app.get("/volunteer_dashboard.html", include_in_schema=False)
    def read_volunteer():
        return FileResponse(os.path.join(frontend_dir, "volunteer_dashboard.html"))

@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "online", "system": "Volunteer Management & Scheduling System API"}
