"""Employee skill roadmap: role suggestions and upskilling plans."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models.analytics import EmployeeSkillScore, RoleProfile, RoleRequiredSkill, Skill, SkillGap
from app.models.employee import Employee
from app.models.organization import Organization
from app.models.user import User
from app.schemas.roadmap import RoadmapGenerateRequest
from app.services.gemini_service import GeminiService
from app.services.matching_service import MatchingService

router = APIRouter()


async def _require_employee_context(
    db: AsyncSession,
    current_user: User,
) -> tuple[Employee, Organization, list[dict[str, Any]], list[dict[str, Any]]]:
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User is not linked to an employee profile")

    emp_res = await db.execute(select(Employee).where(Employee.id == current_user.employee_id))
    emp = emp_res.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    org_res = await db.execute(select(Organization).where(Organization.id == current_user.org_id))
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    skills_res = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == emp.id)
        .order_by(EmployeeSkillScore.proficiency_score.desc())
    )
    current_skills = [
        {
            "name": skill.canonical_name,
            "domain": skill.domain,
            "proficiency": float(score.proficiency_score or 0),
        }
        for score, skill in skills_res.all()
    ]

    gaps_res = await db.execute(
        select(SkillGap, Skill)
        .join(Skill, SkillGap.skill_id == Skill.id)
        .where(SkillGap.employee_id == emp.id, SkillGap.status == "open")
        .order_by(SkillGap.gap_magnitude.desc())
        .limit(15)
    )
    open_gaps = [
        {
            "skill_name": skill.canonical_name,
            "gap_magnitude": float(gap.gap_magnitude or 0),
            "criticality": gap.criticality,
        }
        for gap, skill in gaps_res.all()
    ]

    return emp, org, current_skills, open_gaps


async def _org_role_matches(
    db: AsyncSession,
    org_id,
    current_skills: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    roles_res = await db.execute(select(RoleProfile).where(RoleProfile.org_id == org_id))
    roles = roles_res.scalars().all()
    matches: list[dict[str, Any]] = []

    for role in roles:
        req_res = await db.execute(
            select(RoleRequiredSkill, Skill)
            .join(Skill, RoleRequiredSkill.skill_id == Skill.id)
            .where(RoleRequiredSkill.role_profile_id == role.id)
        )
        role_skills = [
            {
                "name": skill.canonical_name,
                "required_proficiency": rs.required_proficiency,
                "criticality": rs.criticality,
            }
            for rs, skill in req_res.all()
        ]
        if not role_skills:
            continue
        employee_skills = [{"name": s["name"], "proficiency": s["proficiency"]} for s in current_skills]
        match_result = MatchingService.calculate_match_score(employee_skills, role_skills)
        matches.append(
            {
                "role_id": str(role.id),
                "role_title": role.job_title,
                "match_score": match_result["overall_score"],
                "critical_gaps_count": len([g for g in match_result["gaps"] if g["status"] == "missing"]),
            }
        )

    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return matches[:8]


@router.post("/role-suggestions")
async def suggest_target_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    if not (settings.openai_api_key or "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is required for role suggestions.",
        )

    emp, org, current_skills, open_gaps = await _require_employee_context(db, current_user)
    if not current_skills:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Add skills to your profile before requesting role suggestions.",
        )

    org_roles = await _org_role_matches(db, current_user.org_id, current_skills)
    employee_data = {
        "full_name": emp.full_name,
        "job_title": emp.job_title or "Employee",
        "seniority_level": emp.seniority_level,
        "years_of_experience": emp.years_of_experience,
        "field_of_study": emp.field_of_study,
        "highest_qualification": emp.highest_qualification,
    }
    org_context = {
        "sector": org.sector,
        "sub_sector": org.sub_sector,
        "domain": org.domain,
    }

    result = GeminiService.suggest_career_roles(
        employee_data=employee_data,
        org_context=org_context,
        current_skills=current_skills,
        open_gaps=open_gaps,
        org_role_matches=org_roles,
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not generate role suggestions. Check Gemini configuration.",
        )

    return {
        "current_role": emp.job_title or "Current role",
        "employee_domain": org.domain or org.sector,
        "skills_count": len(current_skills),
        "org_role_matches": org_roles,
        **result,
    }


@router.post("/generate")
async def generate_skill_roadmap(
    payload: RoadmapGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    if not (settings.openai_api_key or "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is required to generate a skill roadmap.",
        )

    emp, org, current_skills, open_gaps = await _require_employee_context(db, current_user)
    if not current_skills:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Add skills to your profile before generating a roadmap.",
        )

    target_role = payload.target_role.strip()
    role_skills: list[dict[str, Any]] = []
    role_res = await db.execute(
        select(RoleProfile).where(
            RoleProfile.org_id == current_user.org_id,
            func.lower(RoleProfile.job_title) == target_role.lower(),
        )
    )
    role = role_res.scalar_one_or_none()
    if role:
        req_res = await db.execute(
            select(RoleRequiredSkill, Skill)
            .join(Skill, RoleRequiredSkill.skill_id == Skill.id)
            .where(RoleRequiredSkill.role_profile_id == role.id)
        )
        role_skills = [
            {
                "name": skill.canonical_name,
                "required_proficiency": rs.required_proficiency,
                "criticality": rs.criticality,
            }
            for rs, skill in req_res.all()
        ]

    employee_data = {
        "full_name": emp.full_name,
        "job_title": emp.job_title or "Employee",
        "seniority_level": emp.seniority_level,
        "years_of_experience": emp.years_of_experience,
    }
    org_context = {
        "sector": org.sector,
        "sub_sector": org.sub_sector,
        "domain": org.domain,
    }

    roadmap = GeminiService.generate_skill_roadmap(
        employee_data=employee_data,
        org_context=org_context,
        current_skills=current_skills,
        open_gaps=open_gaps,
        target_role=target_role,
        target_role_skills=role_skills,
    )
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not generate skill roadmap. Check Gemini configuration.",
        )

    return {
        "current_role": emp.job_title or "Current role",
        **roadmap,
    }
