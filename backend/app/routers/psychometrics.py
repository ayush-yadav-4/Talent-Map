"""Psychometric submissions and per-employee results."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models.employee import Employee
from app.models.psychometric import PsychometricResult
from app.models.user import User
from app.services.gemini_service import GeminiService

router = APIRouter()


class PsychometricSubmit(BaseModel):
    employee_id: uuid.UUID | None = None
    assessment_type: Literal["DISC", "BigFive"]
    scores: dict[str, float] = Field(default_factory=dict)


@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_psychometric(
    payload: PsychometricSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    target_employee_id = payload.employee_id or current_user.employee_id
    if not target_employee_id:
        raise HTTPException(status_code=400, detail="No employee_id on user; HR must specify employee_id.")

    if current_user.role not in ("org_admin", "hr_manager") and target_employee_id != current_user.employee_id:
        raise HTTPException(status_code=403, detail="Not authorized to submit for another employee")

    emp = await db.get(Employee, target_employee_id)
    if not emp or emp.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not payload.scores:
        raise HTTPException(status_code=400, detail="scores must not be empty")

    derived = GeminiService.derive_learning_style(
        {k: float(v) for k, v in payload.scores.items()},
        payload.assessment_type,
    )
    row = PsychometricResult(
        employee_id=target_employee_id,
        org_id=emp.org_id,
        assessment_type=payload.assessment_type,
        raw_scores=payload.scores,
        dominant_trait=derived.get("dominant_trait", "unknown")[:120],
        learning_style=derived.get("learning_style", "balanced")[:80],
        summary=derived.get("summary"),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {
        "id": str(row.id),
        "dominant_trait": row.dominant_trait,
        "learning_style": row.learning_style,
        "summary": row.summary,
    }


@router.get("/employee/{employee_id}")
async def get_latest_psychometric(
    employee_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    if current_user.role not in ("org_admin", "hr_manager") and employee_id != current_user.employee_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    emp = await db.get(Employee, employee_id)
    if not emp or emp.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    res = await db.execute(
        select(PsychometricResult)
        .where(PsychometricResult.employee_id == employee_id)
        .order_by(PsychometricResult.completed_at.desc())
        .limit(1)
    )
    row = res.scalar_one_or_none()
    if not row:
        return {"found": False}
    return {
        "found": True,
        "id": str(row.id),
        "assessment_type": row.assessment_type,
        "raw_scores": row.raw_scores,
        "dominant_trait": row.dominant_trait,
        "learning_style": row.learning_style,
        "summary": row.summary,
        "completed_at": row.completed_at.isoformat() if row.completed_at else None,
    }


@router.get("/hr/summary", response_model=list[dict])
async def hr_psychometric_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> list[dict]:
    """Latest psychometric row per employee in org (for HR table)."""
    q = (
        select(PsychometricResult, Employee)
        .join(Employee, Employee.id == PsychometricResult.employee_id)
        .where(PsychometricResult.org_id == current_user.org_id)
        .order_by(PsychometricResult.completed_at.desc())
    )
    result = await db.execute(q)
    seen: set[uuid.UUID] = set()
    out: list[dict] = []
    for pr, emp in result.all():
        if pr.employee_id in seen:
            continue
        seen.add(pr.employee_id)
        out.append(
            {
                "employee_id": str(emp.id),
                "employee_name": emp.full_name,
                "dept_id": str(emp.dept_id) if emp.dept_id else None,
                "assessment_type": pr.assessment_type,
                "dominant_trait": pr.dominant_trait,
                "learning_style": pr.learning_style,
                "completed_at": pr.completed_at.isoformat() if pr.completed_at else None,
            }
        )
    return out
