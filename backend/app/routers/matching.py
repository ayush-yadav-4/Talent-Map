import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.analytics import RoleProfile, RoleRequiredSkill, EmployeeSkillScore, Skill
from app.models.employee import Employee
from app.models.user import User
from app.services.matching_service import MatchingService

router = APIRouter()

@router.get("/employee/{employee_id}/match/{role_id}", response_model=dict)
async def get_role_match(
    employee_id: uuid.UUID,
    role_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Get Role Requirements
    role_res = await db.execute(select(RoleProfile).where(RoleProfile.id == role_id))
    role = role_res.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    req_skills_res = await db.execute(
        select(RoleRequiredSkill, Skill)
        .join(Skill, RoleRequiredSkill.skill_id == Skill.id)
        .where(RoleRequiredSkill.role_profile_id == role_id)
    )
    role_skills = [
        {
            "name": skill.canonical_name, 
            "required_proficiency": rs.required_proficiency,
            "criticality": rs.criticality
        } 
        for rs, skill in req_skills_res.all()
    ]

    # 2. Get Employee Skills
    emp_skills_res = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == employee_id)
    )
    employee_skills = [
        {"name": skill.canonical_name, "proficiency": es.proficiency_score}
        for es, skill in emp_skills_res.all()
    ]

    # 3. Calculate Match
    result = MatchingService.calculate_match_score(employee_skills, role_skills)
    result["role_title"] = role.job_title
    
    return result

@router.get("/employee/{employee_id}/recommendations", response_model=List[dict])
async def get_role_recommendations(
    employee_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Get all roles in the organization
    roles_res = await db.execute(select(RoleProfile).where(RoleProfile.org_id == current_user.org_id))
    roles = roles_res.scalars().all()
    
    # 2. Get employee skills
    emp_skills_res = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == employee_id)
    )
    employee_skills = [
        {"name": skill.canonical_name, "proficiency": es.proficiency_score}
        for es, skill in emp_skills_res.all()
    ]

    recommendations = []
    for role in roles:
        req_skills_res = await db.execute(
            select(RoleRequiredSkill, Skill)
            .join(Skill, RoleRequiredSkill.skill_id == Skill.id)
            .where(RoleRequiredSkill.role_profile_id == role.id)
        )
        role_skills = [
            {
                "name": skill.canonical_name, 
                "required_proficiency": rs.required_proficiency,
                "criticality": rs.criticality
            } 
            for rs, skill in req_skills_res.all()
        ]
        
        match_result = MatchingService.calculate_match_score(employee_skills, role_skills)
        recommendations.append({
            "role_id": role.id,
            "role_title": role.job_title,
            "match_score": match_result["overall_score"],
            "critical_gaps_count": len([g for g in match_result["gaps"] if g["status"] == "missing"])
        })

    # Sort by score descending
    recommendations.sort(key=lambda x: x["match_score"], reverse=True)
    
    return recommendations[:5]

@router.get("/role/{role_id}/top-matches", response_model=List[dict])
async def get_top_employees_for_role(
    role_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Load selected role (for title-based filtering)
    role_res = await db.execute(
        select(RoleProfile).where(
            RoleProfile.id == role_id,
            RoleProfile.org_id == current_user.org_id,
        )
    )
    role = role_res.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    role_title = (role.job_title or "").strip()
    if not role_title:
        return []

    # 2. Get Role requirements
    req_skills_res = await db.execute(
        select(RoleRequiredSkill, Skill)
        .join(Skill, RoleRequiredSkill.skill_id == Skill.id)
        .where(RoleRequiredSkill.role_profile_id == role_id)
    )
    role_skills = [
        {
            "name": skill.canonical_name, 
            "required_proficiency": rs.required_proficiency,
            "criticality": rs.criticality
        } 
        for rs, skill in req_skills_res.all()
    ]

    # 3. Get employees in org filtered by selected role title.
    normalized_role_title = role_title.lower()
    emp_res = await db.execute(
        select(Employee).where(
            Employee.org_id == current_user.org_id,
            Employee.job_title.is_not(None),
            func.lower(func.trim(Employee.job_title)) == normalized_role_title,
        )
    )
    employees = emp_res.scalars().all()

    matches = []
    for emp in employees:
        emp_skills_res = await db.execute(
            select(EmployeeSkillScore, Skill)
            .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
            .where(EmployeeSkillScore.employee_id == emp.id)
        )
        employee_skills = [
            {"name": skill.canonical_name, "proficiency": es.proficiency_score}
            for es, skill in emp_skills_res.all()
        ]
        
        match_result = MatchingService.calculate_match_score(employee_skills, role_skills)
        matches.append({
            "employee_id": emp.id,
            "full_name": emp.full_name,
            "match_score": match_result["overall_score"],
            "gaps": match_result["gaps"]
        })

    matches.sort(key=lambda x: x["match_score"], reverse=True)
    return matches[:10]
