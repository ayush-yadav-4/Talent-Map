import logging

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal
from app.routers import auth, employees, organizations, reports, skills, assessments, employee_skills, role_intelligence, matching, learning, coach, assessment_agent, job_descriptions

if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1)

app = FastAPI(title=settings.app_name, version="1.0.0")

default_dev_origins = {
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
}
origins = [o.strip() for o in settings.app_allowed_origins.split(",") if o.strip()]
origins = sorted(set(origins).union(default_dev_origins))
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(organizations.router, prefix="/api/v1/organizations", tags=["Organizations"])
app.include_router(employees.router, prefix="/api/v1/employees", tags=["Employees"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(skills.router, prefix="/api/v1/skills", tags=["Skills"])
app.include_router(employee_skills.router, prefix="/api/v1/employee-skills", tags=["Employee Skills"])
app.include_router(assessments.router, prefix="/api/v1/assessments", tags=["Assessments"])
app.include_router(role_intelligence.router, prefix="/api/v1/agent/role", tags=["Role Intelligence"])
app.include_router(matching.router, prefix="/api/v1/agent/matching", tags=["Matching Engine"])
app.include_router(learning.router, prefix="/api/v1/agent/learning", tags=["Learning Agent"])
app.include_router(coach.router, prefix="/api/v1/agent/coach", tags=["AI Coach"])
app.include_router(assessment_agent.router, prefix="/api/v1/agent/assessment", tags=["Assessment Agent"])
app.include_router(job_descriptions.router, prefix="/api/v1/job-descriptions", tags=["Job Descriptions"])
from fastapi.staticfiles import StaticFiles
import os
os.makedirs("uploads/resumes", exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory="uploads"), name="static")

logger = logging.getLogger(__name__)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "version": "1.0.0"}


@app.get("/health/db")
async def health_db() -> dict[str, str]:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        logger.exception("health.db.failed")
        raise HTTPException(status_code=503, detail="Database unavailable")
