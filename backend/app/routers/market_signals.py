"""LLM-synthesized market skill demand signals for HR dashboards."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models.organization import Organization
from app.models.user import User
from app.services.gemini_service import GeminiService
from app.services.taxonomy_seed_service import normalize_sector

router = APIRouter()


@router.get("/market-signals")
async def market_signals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager", "manager")),
    sector: str | None = Query(None, max_length=50),
    role: str | None = Query("", max_length=255),
    limit: int = Query(10, ge=3, le=25),
) -> dict:
    org_row = await db.execute(select(Organization.sector).where(Organization.id == current_user.org_id))
    org_sector = org_row.scalar_one_or_none()
    sec = normalize_sector(sector or org_sector)
    signals = GeminiService.get_market_skill_demand(sec, role.strip() or "General workforce", limit=limit)
    return {"sector": sec, "role": role or None, "signals": signals}
