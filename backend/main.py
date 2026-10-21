from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from seed_data import seed

# Routers
from routers import (
    auth,
    employees,
    attendance,
    leaves,
    payroll,
    dashboard,
    notifications
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="WorkSphere – HR Management System API",
    description="Enterprise HRMS API supporting Employees, Attendance, Leaves, Payroll, Roles & Notifications",
    version="1.0.0"
)

# Configure CORS for local development and frontend client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(leaves.router)
app.include_router(payroll.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)

@app.on_event("startup")
def startup_event():
    # Automatically seed default users & records if empty
    seed()

@app.get("/")
def root():
    return {
        "system": "WorkSphere HRMS",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
