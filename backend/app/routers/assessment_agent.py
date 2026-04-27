import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.analytics import Skill, EmployeeSkillScore
from app.models.employee import Employee
from app.models.user import User
from app.services.gemini_service import GeminiService, SkillAssessment, CareerTrajectory

router = APIRouter()

@router.get("/generate/{skill_name}", response_model=SkillAssessment)
async def generate_skill_assessment(
    skill_name: str,
    proficiency: float = 2.0,
    current_user: User = Depends(get_current_user)
):
    assessment = GeminiService.generate_assessment(skill_name, proficiency)
    if not assessment:
        raise HTTPException(status_code=500, detail="Failed to generate assessment")
    return assessment

@router.post("/submit")
async def submit_assessment(
    skill_name: str = Body(..., embed=True),
    score_percentage: float = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User not linked to an employee profile")

    # 1. Map score to proficiency delta (simplified)
    # 100% score -> +0.5 proficiency, <50% -> no change
    delta = 0.0
    if score_percentage >= 90: delta = 0.5
    elif score_percentage >= 70: delta = 0.3
    elif score_percentage >= 50: delta = 0.1

    if delta > 0:
        # Find skill
        skill_res = await db.execute(select(Skill).where(Skill.canonical_name == skill_name))
        skill = skill_res.scalar_one_or_none()
        if skill:
            score_res = await db.execute(
                select(EmployeeSkillScore).where(
                    EmployeeSkillScore.employee_id == current_user.employee_id,
                    EmployeeSkillScore.skill_id == skill.id
                )
            )
            score = score_res.scalar_one_or_none()
            if score:
                score.proficiency_score = min(5.0, score.proficiency_score + delta)
                await db.commit()
                return {"success": True, "new_proficiency": score.proficiency_score, "delta": delta}

    return {"success": True, "new_proficiency": None, "delta": 0, "message": "Score too low for proficiency increase"}

@router.get("/trajectory", response_model=CareerTrajectory)
async def get_career_trajectory(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.employee_id:
        raise HTTPException(status_code=400, detail="User not linked to an employee profile")

    # 1. Fetch employee context
    emp_res = await db.execute(select(Employee).where(Employee.id == current_user.employee_id))
    emp = emp_res.scalar_one_or_none()
    
    # 2. Fetch skills
    skills_res = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == current_user.employee_id)
    )
    skills_data = [{"name": s.canonical_name, "proficiency": sc.proficiency_score} for sc, s in skills_res.all()]
    
    # 3. Predict
    trajectory = GeminiService.predict_career_trajectory(skills_data, emp.job_title if emp else "Professional")
    if not trajectory:
        raise HTTPException(status_code=500, detail="Failed to predict trajectory")
    
    return trajectory
