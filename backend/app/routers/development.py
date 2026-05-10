from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, and_
from typing import List
from uuid import UUID
from datetime import datetime, timedelta

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.employee import Employee
from app.models.analytics import SkillGap, Skill, EmployeeSkillScore, RoleProfile, RoleRequiredSkill
from app.models.development import DevelopmentPlan, DevelopmentMilestone
from app.models.job_description import JDGapAnalysis
from app.schemas.development import (
    DevelopmentPlanCreate, 
    DevelopmentPlanResponse, 
    IDPGenerateRequest,
    MilestoneUpdate
)
from app.services.gemini_service import GeminiService

router = APIRouter()

@router.post("/generate", response_model=dict)
async def generate_idp_endpoint(
    payload: IDPGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User is not an employee")
    
    # 1. Get Employee
    emp_res = await db.execute(select(Employee).where(Employee.id == current_user.employee_id))
    emp = emp_res.scalar_one_or_none()
    
    # 2. Get Current Skills
    skills_res = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == current_user.employee_id)
    )
    current_skills = [
        {"skill_name": skill.canonical_name, "proficiency": score.proficiency_score}
        for score, skill in skills_res.all()
    ]
    
    # 3. Get Existing Skill Gaps
    gaps_res = await db.execute(
        select(SkillGap, Skill)
        .join(Skill, SkillGap.skill_id == Skill.id)
        .where(SkillGap.employee_id == current_user.employee_id, SkillGap.status == "open")
    )
    gaps_data = [
        {"skill_name": skill.canonical_name, "gap_magnitude": gap.gap_magnitude, "source": "official_assessment"}
        for gap, skill in gaps_res.all()
    ]

    # 3.5 Get Gaps from Job Description Analysis (AI-found gaps)
    jd_gaps_res = await db.execute(
        select(JDGapAnalysis)
        .where(JDGapAnalysis.employee_id == current_user.employee_id)
        .order_by(JDGapAnalysis.created_at.desc())
        .limit(3)
    )
    for jd_gap in jd_gaps_res.scalars().all():
        res = jd_gap.analysis_results or {}
        gaps = res.get("gaps") or []
        for g in gaps:
            # If g is a string, use it. If it's an object, extract skill_name
            name = g if isinstance(g, str) else g.get("skill_name")
            if name and not any(dg["skill_name"] == name for dg in gaps_data):
                gaps_data.append({
                    "skill_name": name,
                    "gap_magnitude": 1.0, # AI predicted gap
                    "source": "jd_analysis",
                    "details": g if isinstance(g, dict) else None
                })
    
    # 4. Fallback: If no gaps found, calculate from RoleProfile
    if not gaps_data:
        role_res = await db.execute(
            select(RoleProfile).where(
                RoleProfile.org_id == current_user.org_id,
                func.lower(RoleProfile.job_title) == emp.job_title.lower() if emp.job_title else ""
            )
        )
        role = role_res.scalar_one_or_none()
        if role:
            req_res = await db.execute(
                select(RoleRequiredSkill, Skill)
                .join(Skill, RoleRequiredSkill.skill_id == Skill.id)
                .where(RoleRequiredSkill.role_profile_id == role.id)
            )
            for rs, s in req_res.all():
                # Check if employee has this skill and what proficiency
                emp_skill = next((sk for sk in current_skills if sk["skill_name"] == s.canonical_name), None)
                proficiency = emp_skill["proficiency"] if emp_skill else 0
                if proficiency < rs.required_proficiency:
                    gaps_data.append({
                        "skill_name": s.canonical_name,
                        "gap_magnitude": rs.required_proficiency - proficiency
                    })

    if not gaps_data and not current_skills:
        return {"message": "No skills or gaps found to generate a plan. Please add skills or complete an assessment first.", "milestones": []}

    # 5. Call Gemini
    employee_data = {
        "full_name": emp.full_name,
        "job_title": emp.job_title,
        "seniority_level": emp.seniority_level,
        "current_skills": current_skills
    }
    
    idp = GeminiService.generate_idp(employee_data, gaps_data, payload.target_role)
    
    if not idp:
        raise HTTPException(status_code=500, detail="AI failed to generate development plan")

    return idp.model_dump()

@router.post("/plans", response_model=DevelopmentPlanResponse)
async def create_development_plan(
    payload: DevelopmentPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User is not an employee")
    
    plan = DevelopmentPlan(
        employee_id=current_user.employee_id,
        org_id=current_user.org_id,
        title=payload.title,
        description=payload.description,
        target_role=payload.target_role
    )
    db.add(plan)
    await db.flush()
    
    for m in payload.milestones:
        milestone = DevelopmentMilestone(
            plan_id=plan.id,
            title=m.title,
            description=m.description,
            target_skills=m.target_skills,
            learning_resources=m.learning_resources,
            due_date=m.due_date,
            check_in_focus=m.check_in_focus
        )
        db.add(milestone)
    
    await db.commit()
    await db.refresh(plan)
    return plan

@router.get("/plans", response_model=List[DevelopmentPlanResponse])
async def list_my_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User is not an employee")
        
    res = await db.execute(
        select(DevelopmentPlan)
        .where(DevelopmentPlan.employee_id == current_user.employee_id)
        .order_by(DevelopmentPlan.created_at.desc())
    )
    return res.scalars().all()

@router.get("/plans/{plan_id}", response_model=DevelopmentPlanResponse)
async def get_plan_details(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = await db.execute(
        select(DevelopmentPlan).where(DevelopmentPlan.id == plan_id)
    )
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    if plan.employee_id != current_user.employee_id and current_user.role not in ("org_admin", "hr_manager"):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return plan

@router.patch("/milestones/{milestone_id}", response_model=dict)
async def update_milestone(
    milestone_id: UUID,
    payload: MilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = await db.execute(
        select(DevelopmentMilestone).where(DevelopmentMilestone.id == milestone_id)
    )
    milestone = res.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    # Check ownership via plan
    plan_res = await db.execute(select(DevelopmentPlan).where(DevelopmentPlan.id == milestone.plan_id))
    plan = plan_res.scalar_one()
    if plan.employee_id != current_user.employee_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if payload.status:
        milestone.status = payload.status
        if payload.status == "completed":
            milestone.completed_at = datetime.utcnow()
            
    if payload.outcome_score is not None:
        milestone.outcome_score = payload.outcome_score
        
    if payload.completion_notes:
        milestone.completion_notes = payload.completion_notes
        
    await db.commit()
    return {"updated": True}
