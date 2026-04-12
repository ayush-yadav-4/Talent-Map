from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models.analytics import EmployeeSkillScore, Skill, SkillGap
from app.models.employee import Employee
from app.models.user import User
from app.schemas.employee import (
    BulkEmployeeImport,
    EmployeeCreate,
    EmployeeOnboardingStep1,
    EmployeeOnboardingStep2,
    EmployeeOnboardingStep3,
    EmployeeOnboardingStep4,
    EmployeeResponse,
    EmployeeUpdate,
)
from app.schemas.gap import EmployeeProfileResponse, GapResponse, SkillScoreResponse
from app.services.skill_extractor import seed_skills_from_declared

router = APIRouter()


def _emp_uuid(employee_id: str) -> UUID:
    try:
        return UUID(employee_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid employee id") from exc


def _to_employee_response(emp: Employee) -> EmployeeResponse:
    return EmployeeResponse(
        id=emp.id,
        org_id=emp.org_id,
        dept_id=emp.dept_id,
        email=emp.email,
        full_name=emp.full_name,
        display_name=emp.display_name,
        gender=emp.gender,
        phone=emp.phone,
        profile_photo_url=emp.profile_photo_url,
        job_title=emp.job_title,
        seniority_level=emp.seniority_level,
        employment_type=emp.employment_type or "full_time",
        grade_band=emp.grade_band,
        manager_id=emp.manager_id,
        date_of_joining=emp.date_of_joining,
        years_of_experience=emp.years_of_experience,
        location_city=emp.location_city,
        location_state=emp.location_state,
        employment_status=emp.employment_status or "active",
        is_active=bool(emp.is_active),
        resume_url=emp.resume_url,
        created_at=emp.created_at,
    )


@router.get("/", response_model=list[EmployeeResponse])
async def list_employees(
    skip: int = 0,
    limit: int = 50,
    dept_id: Optional[str] = Query(None),
    employment_status: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EmployeeResponse]:
    query = select(Employee).where(Employee.org_id == current_user.org_id)
    if dept_id:
        try:
            query = query.where(Employee.dept_id == UUID(dept_id))
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid dept_id") from None
    if employment_status:
        query = query.where(Employee.employment_status == employment_status)
    if search:
        q = f"%{search.strip()}%"
        query = query.where(or_(Employee.full_name.ilike(q), Employee.email.ilike(q)))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return [_to_employee_response(e) for e in result.scalars().all()]


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> EmployeeResponse:
    emp = Employee(id=uuid.uuid4(), org_id=current_user.org_id, **data.model_dump())
    db.add(emp)
    await db.flush()
    await db.refresh(emp)
    return _to_employee_response(emp)


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EmployeeResponse:
    eid = _emp_uuid(employee_id)
    result = await db.execute(select(Employee).where(Employee.id == eid))
    emp = result.scalar_one_or_none()
    if not emp or emp.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _to_employee_response(emp)


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EmployeeResponse:
    eid = _emp_uuid(employee_id)
    result = await db.execute(select(Employee).where(Employee.id == eid))
    emp = result.scalar_one_or_none()
    if not emp or emp.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Employee not found")
    is_self = current_user.employee_id == eid
    is_hr = current_user.role in ("org_admin", "hr_manager")
    if not (is_self or is_hr):
        raise HTTPException(status_code=403, detail="Not authorized")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(emp, field, value)
    await db.flush()
    await db.refresh(emp)
    return _to_employee_response(emp)


@router.get("/{employee_id}/profile", response_model=EmployeeProfileResponse)
async def get_employee_profile(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EmployeeProfileResponse:
    eid = _emp_uuid(employee_id)
    result = await db.execute(select(Employee).where(Employee.id == eid))
    emp = result.scalar_one_or_none()
    if not emp or emp.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    scores_result = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == eid)
        .order_by(desc(EmployeeSkillScore.proficiency_score).nulls_last())
    )
    scores: list[SkillScoreResponse] = []
    for score, skill in scores_result.all():
        scores.append(
            SkillScoreResponse(
                skill_id=score.skill_id,
                skill_name=skill.canonical_name,
                skill_domain=skill.domain,
                proficiency_score=float(score.proficiency_score or 0.0),
                proficiency_level=score.proficiency_level or "awareness",
                confidence=float(score.confidence or 0.0),
                evidence_count=int(score.evidence_count or 0),
                self_rating=score.self_rating,
                certification_name=score.certification_name,
                certification_expiry=score.certification_expiry,
                is_expired=bool(score.is_expired),
                last_computed_at=score.last_computed_at or emp.updated_at,
            )
        )

    gaps_result = await db.execute(
        select(SkillGap, Skill)
        .join(Skill, SkillGap.skill_id == Skill.id)
        .where(and_(SkillGap.employee_id == eid, SkillGap.status == "open"))
        .order_by(desc(SkillGap.priority_score).nulls_last())
        .limit(20)
    )
    gaps: list[GapResponse] = []
    for gap, skill in gaps_result.all():
        gaps.append(
            GapResponse(
                skill_id=gap.skill_id,
                skill_name=skill.canonical_name,
                skill_domain=skill.domain,
                required_proficiency=float(gap.required_proficiency),
                current_proficiency=float(gap.current_proficiency or 0.0),
                gap_magnitude=float(gap.gap_magnitude),
                criticality=gap.criticality or "important",
                priority_score=float(gap.priority_score or 0.0),
                urgency_factor=float(gap.urgency_factor or 1.0),
                is_compliance=bool(skill.is_compliance),
                status=gap.status or "open",
            )
        )

    avg_proficiency = sum(s.proficiency_score for s in scores) / len(scores) if scores else 0.0
    critical_gaps = sum(1 for g in gaps if g.criticality == "essential")
    expiring_certs = sum(1 for s in scores if s.certification_expiry is not None and not s.is_expired)

    return EmployeeProfileResponse(
        employee=_to_employee_response(emp),
        skill_scores=scores,
        gaps=gaps,
        total_skills=len(scores),
        avg_proficiency=round(avg_proficiency, 2),
        critical_gaps=critical_gaps,
        expiring_certs=expiring_certs,
    )


@router.put("/{employee_id}/onboarding/step1", response_model=dict)
async def employee_onboarding_step1(
    employee_id: str,
    data: EmployeeOnboardingStep1,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    eid = _emp_uuid(employee_id)
    result = await db.execute(select(Employee).where(Employee.id == eid))
    emp = result.scalar_one_or_none()
    if not emp or emp.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Employee not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(emp, field, value)
    user_result = await db.execute(select(User).where(User.employee_id == eid))
    user = user_result.scalar_one_or_none()
    if user:
        user.onboarding_step = 2
    return {"message": "Step 1 saved", "next_step": 2}


@router.put("/{employee_id}/onboarding/step2", response_model=dict)
async def employee_onboarding_step2(
    employee_id: str,
    data: EmployeeOnboardingStep2,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    eid = _emp_uuid(employee_id)
    result = await db.execute(select(Employee).where(Employee.id == eid))
    emp = result.scalar_one_or_none()
    if not emp or emp.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Employee not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(emp, field, value)
    user_result = await db.execute(select(User).where(User.employee_id == eid))
    user = user_result.scalar_one_or_none()
    if user:
        user.onboarding_step = 3
    return {"message": "Step 2 saved", "next_step": 3}


@router.put("/{employee_id}/onboarding/step3", response_model=dict)
async def employee_onboarding_step3(
    employee_id: str,
    data: EmployeeOnboardingStep3,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    eid = _emp_uuid(employee_id)
    result = await db.execute(select(Employee).where(Employee.id == eid))
    emp = result.scalar_one_or_none()
    if not emp or emp.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Employee not found")
    payload = data.model_dump(exclude_none=True, exclude={"declared_skills"})
    for field, value in payload.items():
        setattr(emp, field, value)
    if data.declared_skills:
        await seed_skills_from_declared(db, str(eid), data.declared_skills)
    user_result = await db.execute(select(User).where(User.employee_id == eid))
    user = user_result.scalar_one_or_none()
    if user:
        user.onboarding_step = 4
    return {"message": "Step 3 saved", "next_step": 4}


@router.put("/{employee_id}/onboarding/step4", response_model=dict)
async def employee_onboarding_step4(
    employee_id: str,
    data: EmployeeOnboardingStep4,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    eid = _emp_uuid(employee_id)
    result = await db.execute(select(Employee).where(Employee.id == eid))
    emp = result.scalar_one_or_none()
    if not emp or emp.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.consent_github = data.consent_github
    emp.consent_email = data.consent_email
    emp.consent_teams = data.consent_teams
    emp.consent_slack = data.consent_slack
    emp.consent_updated_at = datetime.now(timezone.utc)
    emp.onboarded_at = datetime.now(timezone.utc)
    user_result = await db.execute(select(User).where(User.employee_id == eid))
    user = user_result.scalar_one_or_none()
    if user:
        user.onboarding_completed = True
        user.onboarding_step = 4
    return {"message": "Onboarding complete!", "redirect": "/employee/dashboard"}


@router.post("/bulk-import", response_model=dict)
async def bulk_import_employees(
    data: BulkEmployeeImport,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    created = 0
    errors: list[dict[str, str]] = []
    for emp_data in data.employees:
        try:
            emp = Employee(id=uuid.uuid4(), org_id=current_user.org_id, **emp_data.model_dump())
            db.add(emp)
            created += 1
        except Exception as e:  # noqa: BLE001
            errors.append({"email": str(emp_data.email), "error": str(e)})
    await db.flush()
    return {"created": created, "errors": errors}


@router.put("/{employee_id}/self-rating", response_model=dict)
async def submit_self_rating(
    employee_id: str,
    ratings: list[dict] = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    eid = _emp_uuid(employee_id)
    if current_user.employee_id != eid and current_user.role not in ("org_admin", "hr_manager"):
        raise HTTPException(status_code=403, detail="Not authorized")
    for rating in ratings:
        sid = rating.get("skill_id")
        if not sid:
            continue
        skill_uuid = UUID(str(sid))
        score_result = await db.execute(
            select(EmployeeSkillScore).where(
                and_(EmployeeSkillScore.employee_id == eid, EmployeeSkillScore.skill_id == skill_uuid)
            )
        )
        score = score_result.scalar_one_or_none()
        if score:
            score.self_rating = float(rating["rating"])
            score.self_rating_note = rating.get("note")
            score.self_rating_date = datetime.now(timezone.utc)
    return {"message": "Ratings saved"}
