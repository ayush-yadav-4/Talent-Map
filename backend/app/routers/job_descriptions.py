from __future__ import annotations

import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy import select, delete, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.department import Department
from app.models.employee import Employee
from app.models.job_description import JobDescription, JDGapAnalysis
from app.models.user import User
from app.services.gemini_service import GeminiService
from pydantic import BaseModel

router = APIRouter()

class JDCreate(BaseModel):
    title: str
    role_type: Optional[str] = None
    domain: Optional[str] = None
    seniority: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    summary: Optional[str] = None
    responsibilities: Optional[str] = None
    requirements: str # The core text for AI extraction


class JDUpdate(BaseModel):
    title: Optional[str] = None
    role_type: Optional[str] = None
    domain: Optional[str] = None
    seniority: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    summary: Optional[str] = None
    responsibilities: Optional[str] = None
    requirements: Optional[str] = None

@router.post("", response_model=dict, include_in_schema=False)
@router.post("/", response_model=dict)
async def create_job_description(
    payload: JDCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("org_admin", "hr_manager"):
        raise HTTPException(status_code=403, detail="Not authorized")

    # AI Extract skills from requirements
    extraction = GeminiService.extract_skills_from_jd(payload.requirements)
    structured_skills = extraction.model_dump() if extraction else {}

    jd = JobDescription(
        id=uuid.uuid4(),
        org_id=current_user.org_id,
        title=payload.title,
        role_type=payload.role_type,
        domain=payload.domain,
        seniority=payload.seniority,
        location=payload.location,
        employment_type=payload.employment_type,
        summary=payload.summary or (extraction.description_summary if extraction else ""),
        responsibilities=payload.responsibilities,
        requirements=payload.requirements,
        structured_skills=structured_skills
    )
    
    db.add(jd)
    await db.commit()
    await db.refresh(jd)
    
    return {"id": jd.id, "title": jd.title}

@router.get("", response_model=List[dict], include_in_schema=False)
@router.get("/", response_model=List[dict])
async def list_job_descriptions(
    role_type: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(JobDescription).where(JobDescription.org_id == current_user.org_id)
    
    if role_type:
        query = query.where(JobDescription.role_type == role_type)
    if domain:
        query = query.where(JobDescription.domain == domain)
        
    result = await db.execute(query.order_by(JobDescription.created_at.desc()))
    jds = result.scalars().all()
    
    return [
        {
            "id": jd.id,
            "title": jd.title,
            "role_type": jd.role_type,
            "domain": jd.domain,
            "seniority": jd.seniority,
            "created_at": jd.created_at
        } for jd in jds
    ]


@router.get("/my/gaps", response_model=List[dict])
async def list_my_jd_gaps(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.employee_id:
        return []

    result = await db.execute(
        select(JDGapAnalysis, JobDescription)
        .join(JobDescription, JDGapAnalysis.jd_id == JobDescription.id)
        .where(JDGapAnalysis.employee_id == current_user.employee_id)
        .order_by(JDGapAnalysis.created_at.desc())
    )

    items = []
    for gap, jd in result.all():
        analysis = gap.analysis_results or {}
        items.append(
            {
                "id": str(gap.id),
                "jd_id": str(jd.id),
                "jd_title": jd.title,
                "fit_score": float(gap.fit_score or 0),
                "created_at": gap.created_at,
                "strengths_count": len(analysis.get("strengths") or []),
                "gaps_count": len(analysis.get("gaps") or []),
                "analysis_results": analysis,
            }
        )
    return items

@router.get("/{jd_id}", response_model=dict)
async def get_jd_details(
    jd_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        jid = uuid.UUID(jd_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid JD id")

    jd = await db.get(JobDescription, jid)
    if not jd or jd.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Job Description not found")

    return {
        "id": jd.id,
        "title": jd.title,
        "role_type": jd.role_type,
        "domain": jd.domain,
        "seniority": jd.seniority,
        "location": jd.location,
        "employment_type": jd.employment_type,
        "summary": jd.summary,
        "responsibilities": jd.responsibilities,
        "requirements": jd.requirements,
        "structured_skills": jd.structured_skills
    }


@router.put("/{jd_id}", response_model=dict)
async def update_job_description(
    jd_id: str,
    payload: JDUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("org_admin", "hr_manager"):
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        jid = uuid.UUID(jd_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid JD id")

    jd = await db.get(JobDescription, jid)
    if not jd or jd.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Job Description not found")

    patch_data = payload.model_dump(exclude_unset=True)
    if "requirements" in patch_data and patch_data["requirements"]:
        extraction = GeminiService.extract_skills_from_jd(patch_data["requirements"])
        if extraction:
            jd.structured_skills = extraction.model_dump()
            if not patch_data.get("summary"):
                jd.summary = extraction.description_summary

    for key, value in patch_data.items():
        setattr(jd, key, value)

    await db.commit()
    await db.refresh(jd)
    return {"updated": True, "id": str(jd.id), "title": jd.title}

@router.post("/{jd_id}/analyze-gap", response_model=dict)
async def analyze_gap_for_jd(
    jd_id: str,
    employee_id: Optional[int] = Query(None, description="Provide to analyze a specific employee (HR/Admin only)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # This is the new Gap Analysis: Employee Skills vs JD
    try:
        jid = uuid.UUID(jd_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid JD id")

    jd = await db.get(JobDescription, jid)
    if not jd:
        raise HTTPException(status_code=404, detail="JD not found")

    # Determine target employee
    target_emp_id = current_user.employee_id
    if employee_id is not None:
        if current_user.role not in ("org_admin", "hr_manager"):
            raise HTTPException(status_code=403, detail="Not authorized to analyze other employees")
        target_emp_id = employee_id

    if not target_emp_id:
        raise HTTPException(status_code=400, detail="No employee selected for analysis")

    # Fetch employee skills
    from app.models.analytics import EmployeeSkillScore, Skill
    scores_res = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == target_emp_id)
    )
    
    employee_skills = []
    for score, skill in scores_res.all():
        employee_skills.append({
            "name": skill.canonical_name,
            "proficiency": score.proficiency_score
        })

    # Use Gemini to compare
    analysis = GeminiService.analyze_gap_vs_jd(employee_skills, jd.structured_skills or {})
    
    # SAVE the result
    gap_record = JDGapAnalysis(
        id=uuid.uuid4(),
        employee_id=target_emp_id,
        jd_id=jid,
        fit_score=float(analysis.get("fit_score", 0)),
        analysis_results=analysis
    )
    db.add(gap_record)
    await db.commit()

    return {
        "jd_title": jd.title,
        "gap_id": str(gap_record.id),
        "analysis": analysis
    }

@router.get("/all/gaps", response_model=List[dict])
async def list_all_gaps(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("org_admin", "hr_manager"):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(JDGapAnalysis, Employee, JobDescription, Department)
        .join(Employee, JDGapAnalysis.employee_id == Employee.id)
        .join(JobDescription, JDGapAnalysis.jd_id == JobDescription.id)
        .outerjoin(Department, Employee.dept_id == Department.id)
        .where(Employee.org_id == current_user.org_id)
        .order_by(JDGapAnalysis.created_at.desc())
    )

    gaps = []
    for gap, emp, jd, dept in result.all():
        gaps.append(
            {
                "id": gap.id,
                "employee_id": emp.id,
                "employee_name": emp.full_name,
                "dept_id": str(emp.dept_id) if emp.dept_id else None,
                "dept_name": dept.name if dept else None,
                "jd_id": jd.id,
                "jd_title": jd.title,
                "fit_score": gap.fit_score,
                "analysis_results": gap.analysis_results,
                "created_at": gap.created_at,
            }
        )
    return gaps

@router.delete("/{jd_id}")
async def delete_jd(
    jd_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("org_admin", "hr_manager"):
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        jid = uuid.UUID(jd_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid JD id")

    await db.execute(delete(JobDescription).where(JobDescription.id == jid))
    await db.commit()
    return {"success": True}

@router.get("/gaps/{gap_id}/hire-vs-upskill", response_model=dict)
async def analyze_hire_vs_upskill_endpoint(
    gap_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("org_admin", "hr_manager"):
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        gid = uuid.UUID(gap_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid gap id")

    gap = await db.get(JDGapAnalysis, gid)
    if not gap:
        raise HTTPException(status_code=404, detail="Gap analysis not found")

    emp = await db.get(Employee, gap.employee_id)
    jd = await db.get(JobDescription, gap.jd_id)
    if not emp or not jd:
        raise HTTPException(status_code=404, detail="Employee or JD not found")

    from app.models.analytics import EmployeeSkillScore, Skill, SkillEvidence
    scores_res = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == gap.employee_id)
    )
    
    employee_skills = [{"name": skill.canonical_name, "proficiency": score.proficiency_score} for score, skill in scores_res.all()]

    evidence_res = await db.execute(
        select(SkillEvidence, Skill)
        .join(Skill, SkillEvidence.skill_id == Skill.id)
        .where(SkillEvidence.employee_id == gap.employee_id)
    )
    
    skill_evidences = []
    for evidence, skill in evidence_res.all():
        skill_evidences.append({
            "skill_name": skill.canonical_name,
            "source_type": evidence.source_type, # e.g. assessment, github, jira, self_declared, etc.
            "proficiency_raw": evidence.proficiency_raw,
            "evidence_snippet": evidence.evidence_snippet
        })

    employee_persona = {
        "full_name": emp.full_name,
        "job_title": emp.job_title,
        "seniority_level": emp.seniority_level,
        "years_of_experience": emp.years_of_experience,
        "highest_qualification": emp.highest_qualification,
        "clinical_specialization": emp.clinical_specialization,
        "grade_band": emp.grade_band,
        "project_status": emp.project_status,
        "fit_score_for_target_role": gap.fit_score,
        "aggregated_skills": employee_skills,
        "skill_test_evidences": skill_evidences,
        "identified_gaps_for_target_role": gap.analysis_results.get("gaps", []),
        "salary_estimate": 75000
    }

    job_description = {
        "title": jd.title,
        "role_type": jd.role_type,
        "requirements": jd.requirements
    }

    market_data = {
        "avg_hire_cost": 15000,
        "avg_hire_time_months": 3.0,
        "avg_training_cost": 3000,
        "market_salary": 90000
    }

    decision = GeminiService.analyze_hire_vs_upskill(
        employee_persona=employee_persona,
        job_description=job_description,
        market_data=market_data
    )

    if not decision:
         raise HTTPException(status_code=500, detail="Failed to analyze hire vs upskill")

    decision_dict = decision.model_dump()
    
    # Store the decision in the gap analysis results
    if not gap.analysis_results:
        gap.analysis_results = {}
    
    updated_results = dict(gap.analysis_results)
    updated_results["build_vs_buy"] = decision_dict
    gap.analysis_results = updated_results
    
    await db.commit()

    return decision_dict

