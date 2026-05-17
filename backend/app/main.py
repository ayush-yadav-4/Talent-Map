import asyncio
import logging
import sys
from pathlib import Path

# Uvicorn --reload spawns a child that imports this module but not run_backend.py; async
# psycopg on Windows otherwise uses Proactor and raises InterfaceError on DB access.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.config import settings
from app.database import AsyncSessionLocal
from app.routers import (
    auth,
    assessments,
    assessment_agent,
    coach,
    employee_skills,
    employees,
    job_descriptions,
    learning,
    market_signals,
    matching,
    organizations,
    psychometrics,
    reports,
    role_intelligence,
    skills,
    development,
)

if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1)

logging.basicConfig(
    level=getattr(logging, settings.app_log_level, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        logger.info("database.startup.connected")
    except Exception:
        logger.exception(
            "database.startup.failed — check DATABASE_URL, Supabase project status (paused?), "
            "and network. For Supabase try the pooler URL on port 6543 if direct :5432 times out."
        )
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.app_enable_docs else None,
    redoc_url="/redoc" if settings.app_enable_docs else None,
    openapi_url="/openapi.json" if settings.app_enable_docs else None,
)


@app.exception_handler(OperationalError)
async def database_operational_error_handler(_request, exc: OperationalError):
    logger.exception("database.unavailable")
    detail = "Database temporarily unavailable. Verify Supabase is running and DATABASE_URL is correct."
    if "timeout" in str(exc).lower():
        detail = (
            "Database connection timed out. If using Supabase: open the dashboard and resume the project "
            "if paused, then use the pooler URI (port 6543) in DATABASE_URL or check your network."
        )
    return JSONResponse(status_code=503, content={"detail": detail})

default_dev_origins = {
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
}
origins = set(settings.allowed_origins_list)
if settings.app_cors_include_localhost and not settings.is_production:
    origins = origins.union(default_dev_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def apply_security_headers(_request, call_next):
    response: Response = await call_next(_request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

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
app.include_router(market_signals.router, prefix="/api/v1/agent", tags=["Market Signals"])
app.include_router(job_descriptions.router, prefix="/api/v1/job-descriptions", tags=["Job Descriptions"])
app.include_router(psychometrics.router, prefix="/api/v1/psychometrics", tags=["Psychometrics"])
app.include_router(development.router, prefix="/api/v1/development", tags=["Development Plans"])
uploads_dir = Path("uploads")
uploads_dir.joinpath("resumes").mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(uploads_dir)), name="static")


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
        raise HTTPException(
            status_code=503,
            detail=(
                "Database unavailable. Check Supabase project status and DATABASE_URL "
                "(pooler port 6543 often more reliable than direct :5432)."
            ),
        )
