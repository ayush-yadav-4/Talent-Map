"""Skills: lightweight role hints, taxonomy browse/seed (HR), and search placeholder."""

from __future__ import annotations

import re
import uuid
from typing import Any, Iterable

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models.analytics import Skill
from app.models.organization import Organization
from app.models.user import User
from app.services.gemini_service import GeminiService
from app.services.taxonomy_seed_service import domains_for_sector, normalize_sector

router = APIRouter()


def _infer_skills_from_title(title: str) -> list[dict[str, str]]:
    t = title.lower()
    out: list[tuple[str, str]] = []
    rules: Iterable[tuple[str, list[str]]] = (
        ("engineer", ["Python", "SQL", "Git", "API design", "Testing"]),
        ("developer", ["JavaScript", "TypeScript", "Git", "CI/CD", "Debugging"]),
        ("data", ["SQL", "Python", "Data analysis", "Statistics", "Visualization"]),
        ("product", ["Roadmapping", "User research", "Stakeholder management", "Analytics", "Prioritization"]),
        ("nurse", ["Patient care", "Clinical documentation", "Medication administration", "Triage", "Infection control"]),
        ("doctor", ["Clinical diagnosis", "Patient assessment", "Evidence-based medicine", "Documentation", "Communication"]),
        ("manager", ["People leadership", "Planning", "Budgeting", "Stakeholder communication", "Performance management"]),
        ("sales", ["Prospecting", "Negotiation", "CRM", "Presentation", "Pipeline management"]),
        ("hr", ["Talent acquisition", "Employee relations", "Payroll basics", "Policy", "Coaching"]),
    )
    for needle, skills in rules:
        if needle in t:
            out = [(s, "inferred") for s in skills]
            break
    if not out:
        out = [
            ("Communication", "general"),
            ("Problem solving", "general"),
            ("Collaboration", "general"),
            ("Documentation", "general"),
            ("Domain knowledge", "general"),
        ]
    return [{"name": name, "domain": domain} for name, domain in out[:5]]


@router.get("/search")
async def search_skills(q: str = Query("", max_length=200)) -> list[dict]:
    """Placeholder — wire to ESCO / vector search when indexed."""
    _ = q
    return []


@router.get("/by-role")
async def skills_by_role(title: str = Query("", max_length=255)) -> list[dict]:
    """Lightweight title → skill hints until ESCO + FAISS is wired."""
    cleaned = re.sub(r"\s+", " ", title).strip()
    if not cleaned:
        return []
    return _infer_skills_from_title(cleaned)


class TaxonomySeedRequest(BaseModel):
    sector: str | None = None
    count: int = Field(default=80, ge=10, le=120)


class TaxonomyAddRequest(BaseModel):
    canonical_name: str = Field(..., min_length=2, max_length=500)
    domain: str = Field(..., min_length=2, max_length=100)
    sub_domain: str | None = Field(None, max_length=100)
    sector: str = Field(..., min_length=2, max_length=50)
    is_compliance: bool = False


def _sector_taxonomy_filter(sec: str):
    """Skills tagged for sector, or globally untagged (empty tags)."""
    return or_(
        Skill.sector_tags.overlap([sec]),
        func.cardinality(Skill.sector_tags) == 0,
    )


@router.get("/taxonomy")
async def list_taxonomy(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager", "manager")),
    sector: str | None = Query(None, max_length=50),
    domain: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
) -> dict[str, Any]:
    org_row = await db.execute(select(Organization.sector).where(Organization.id == current_user.org_id))
    org_sector = org_row.scalar_one_or_none()
    sec = normalize_sector(sector or org_sector)

    filters = [_sector_taxonomy_filter(sec)]
    if domain and domain.strip():
        filters.append(Skill.domain.ilike(f"%{domain.strip()}%"))

    total = int(
        await db.scalar(select(func.count()).select_from(Skill).where(*filters)) or 0
    )

    offset = (page - 1) * limit
    result = await db.execute(
        select(Skill)
        .where(*filters)
        .order_by(Skill.domain.asc().nulls_last(), Skill.canonical_name.asc())
        .offset(offset)
        .limit(limit)
    )
    items = result.scalars().all()

    dom_q = (
        select(Skill.domain)
        .where(*filters)
        .where(Skill.domain.isnot(None))
        .distinct()
        .order_by(Skill.domain.asc())
    )
    dom_res = await db.execute(dom_q)
    domains = [r[0] for r in dom_res.all() if r[0]]

    return {
        "sector": sec,
        "page": page,
        "limit": limit,
        "total": total,
        "domains": domains,
        "items": [
            {
                "id": str(s.id),
                "canonical_name": s.canonical_name,
                "domain": s.domain,
                "sub_domain": getattr(s, "sub_domain", None),
                "sector_tags": list(s.sector_tags or []),
                "is_compliance": bool(s.is_compliance),
            }
            for s in items
        ],
    }


@router.post("/taxonomy/seed", status_code=status.HTTP_201_CREATED)
async def seed_taxonomy(
    payload: TaxonomySeedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict[str, Any]:
    if not (settings.gemini_api_key or "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is required to seed skills.",
        )

    org_row = await db.execute(select(Organization.sector).where(Organization.id == current_user.org_id))
    org_sector = org_row.scalar_one_or_none()
    sec = normalize_sector(payload.sector or org_sector)
    domains = domains_for_sector(sec)
    rows = GeminiService.seed_skills_for_sector(sec, domains, count=payload.count)
    if not rows:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="No skills generated; check Gemini logs.")

    created = 0
    updated = 0
    for row in rows:
        name = row["canonical_name"]
        if not name:
            continue
        existing = await db.execute(select(Skill).where(func.lower(Skill.canonical_name) == name.lower()))
        skill = existing.scalar_one_or_none()
        tags = [sec]
        if skill:
            merged = list({*(skill.sector_tags or []), *tags})
            skill.sector_tags = merged
            skill.domain = row.get("domain") or skill.domain
            if row.get("sub_domain"):
                skill.sub_domain = row["sub_domain"]
            skill.is_compliance = bool(row.get("is_compliance")) or skill.is_compliance
            updated += 1
        else:
            skill = Skill(
                id=uuid.uuid4(),
                canonical_name=name[:500],
                domain=(row.get("domain") or domains[0])[:100],
                sub_domain=(row.get("sub_domain") or None),
                sector_tags=tags,
                is_compliance=bool(row.get("is_compliance")),
            )
            db.add(skill)
            created += 1
    await db.commit()
    return {"sector": sec, "created": created, "updated": updated, "requested": payload.count}


@router.post("/taxonomy/add", status_code=status.HTTP_201_CREATED)
async def add_taxonomy_skill(
    payload: TaxonomyAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict[str, Any]:
    sec = normalize_sector(payload.sector)
    dup = await db.execute(
        select(Skill).where(func.lower(Skill.canonical_name) == payload.canonical_name.strip().lower())
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Skill name already exists")

    skill = Skill(
        id=uuid.uuid4(),
        canonical_name=payload.canonical_name.strip()[:500],
        domain=payload.domain.strip()[:100],
        sub_domain=payload.sub_domain.strip()[:100] if payload.sub_domain else None,
        sector_tags=[sec],
        is_compliance=payload.is_compliance,
    )
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return {"id": str(skill.id), "canonical_name": skill.canonical_name}
