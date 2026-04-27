from __future__ import annotations

import io
import uuid
import logging
import os
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

# Use pymupdf (fitz) for better extraction as requested in Module 1
try:
    import fitz 
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    from PyPDF2 import PdfReader

from app.database import get_db
from app.deps import get_current_user
from app.models.employee import Employee
from app.models.analytics import Skill, EmployeeSkillScore
from app.models.user import User
from app.services.gemini_service import GeminiService
from app.services.profile_insights_store import profile_insights_store
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

class SkillDeclaration(BaseModel):
    skill_name: str
    proficiency: float
    years_of_experience: float = 0.0
    is_technical: bool = False

class BulkSkillUpdate(BaseModel):
    skills: List[SkillDeclaration]

@router.post("/{employee_id}/resume", response_model=dict)
async def upload_resume_and_extract_skills(
    employee_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        eid = UUID(employee_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid employee id")

    if current_user.employee_id != eid and current_user.role not in ("org_admin", "hr_manager"):
        raise HTTPException(status_code=403, detail="Not authorized")

    content = await file.read()
    text = ""
    
    if file.filename and file.filename.lower().endswith(".pdf"):
        try:
            if PYMUPDF_AVAILABLE:
                # Use PyMuPDF for high-quality extraction
                doc = fitz.open(stream=content, filetype="pdf")
                for page in doc:
                    text += page.get_text() + "\n"
                doc.close()
            else:
                # Fallback to PyPDF2
                reader = PdfReader(io.BytesIO(content))
                for page in reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            logger.error(f"Error parsing PDF: {e}")
            raise HTTPException(status_code=400, detail=f"Could not parse PDF file: {str(e)}")
    else:
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            logger.error("UnicodeDecodeError during resume upload")
            raise HTTPException(status_code=400, detail="Only PDF or UTF-8 text files are supported")

    if not text.strip():
        logger.warning("Resume upload resulted in empty text")
        raise HTTPException(status_code=400, detail="No text content found in resume")

    # Extract skills using Gemini
    extracted_skills = GeminiService.extract_skills_from_resume(text)
    
    # Save resume file locally
    upload_dir = "uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)
    file_ext = file.filename.split(".")[-1] if file.filename else "pdf"
    filename = f"{employee_id}_{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Update employee resume_url
    emp_res = await db.execute(select(Employee).where(Employee.id == eid))
    emp = emp_res.scalar_one_or_none()
    if emp:
        # Save relative path for static serving
        emp.resume_url = f"/static/uploads/resumes/{filename}"
        emp.resume_parsed_at = func.now()
        await db.commit()

    return {
        "extracted_skills": extracted_skills,
        "raw_text_length": len(text),
        "resume_url": emp.resume_url if emp else None
    }

@router.post("/{employee_id}/skills/bulk", response_model=dict)
async def save_employee_skills_bulk(
    employee_id: str,
    payload: BulkSkillUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        eid = UUID(employee_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid employee id")

    if current_user.employee_id != eid and current_user.role not in ("org_admin", "hr_manager"):
        raise HTTPException(status_code=403, detail="Not authorized")

    saved_count = 0
    for sd in payload.skills:
        # Check if skill exists in ontology
        skill_res = await db.execute(select(Skill).where(Skill.canonical_name == sd.skill_name))
        skill = skill_res.scalar_one_or_none()
        
        if not skill:
            # Generate embedding - ensure it's a valid list or None
            embedding = GeminiService.get_embedding(sd.skill_name)
            if not embedding or len(embedding) != 768:
                logger.warning(f"Could not generate valid 768D embedding for skill {sd.skill_name}. Using zero vector.")
                embedding = [0.0] * 768

            skill = Skill(
                id=uuid.uuid4(),
                canonical_name=sd.skill_name,
                domain="Technical" if sd.is_technical else "Professional",
                embedding=embedding
            )
            db.add(skill)
            await db.flush()
        
        # Upsert EmployeeSkillScore
        score_res = await db.execute(
            select(EmployeeSkillScore).where(
                EmployeeSkillScore.employee_id == eid,
                EmployeeSkillScore.skill_id == skill.id
            )
        )
        score = score_res.scalar_one_or_none()
        
        if score:
            score.proficiency_score = sd.proficiency
            score.self_rating = sd.proficiency
            score.years_of_experience = sd.years_of_experience
        else:
            score = EmployeeSkillScore(
                id=uuid.uuid4(),
                employee_id=eid,
                skill_id=skill.id,
                proficiency_score=sd.proficiency,
                self_rating=sd.proficiency,
                years_of_experience=sd.years_of_experience,
                confidence=0.5
            )
            db.add(score)
        
        saved_count += 1
    
    logger.info(f"Successfully saved {saved_count} skills for employee {eid}")
    await db.commit()
    return {"success": True, "saved_count": saved_count}

@router.post("/{employee_id}/sync-ai-insights", response_model=dict)
async def sync_ai_insights(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        eid = uuid.UUID(employee_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid employee id")

    if current_user.employee_id != eid:
        raise HTTPException(status_code=403, detail="Not authorized")

    emp = await db.get(Employee, eid)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check cooldown (once a day)
    if emp.last_ai_sync_at:
        now = datetime.now()
        diff = now - emp.last_ai_sync_at.replace(tzinfo=None)
        if diff.total_seconds() < 86400: # 24 hours
            hours_left = int((86400 - diff.total_seconds()) / 3600)
            raise HTTPException(
                status_code=400, 
                detail=f"AI Sync is limited to once every 24 hours. Please try again in {hours_left} hours."
            )

    # Perform Analysis (Strength/Gaps)
    scores_res = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == eid)
    )
    
    skills_data = []
    for score, skill in scores_res.all():
        skills_data.append({
            "name": skill.canonical_name,
            "proficiency": score.proficiency_score,
            "domain": skill.domain
        })
        
    if not skills_data:
        raise HTTPException(status_code=400, detail="Please add at least one skill before syncing AI insights.")

    analysis = GeminiService.analyze_skill_profile(skills_data, emp.job_title or "Professional")
    trajectory = GeminiService.predict_career_trajectory(skills_data, emp.job_title or "Professional")

    result_payload = {
        "analysis": analysis,
        "trajectory": trajectory,
        "skills_count": len(skills_data),
        "job_title": emp.job_title or "Professional",
    }

    # Persist only the latest profile analysis output in MongoDB for this employee.
    await profile_insights_store.save_latest(
        employee_id=str(eid),
        org_id=str(emp.org_id),
        payload=result_payload,
    )

    # Update timestamp
    emp.last_ai_sync_at = func.now()
    await db.commit()

    return {
        "analysis": analysis,
        "trajectory": trajectory,
        "last_sync": emp.last_ai_sync_at
    }


@router.get("/{employee_id}/sync-ai-insights/latest", response_model=dict)
async def get_latest_sync_ai_insights(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        eid = UUID(employee_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid employee id")

    emp_res = await db.execute(select(Employee).where(Employee.id == eid))
    emp = emp_res.scalar_one_or_none()
    if not emp or emp.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    is_self = current_user.employee_id == eid
    is_elevated = current_user.role in ("org_admin", "hr_manager")
    if not is_self and not is_elevated:
        raise HTTPException(status_code=403, detail="Not authorized")

    latest = await profile_insights_store.get_latest(str(eid))
    if not latest:
        return {"found": False}
    return {"found": True, "data": latest}

@router.get("/{employee_id}/analysis", response_model=dict)
async def analyze_skills_and_suggest_assessments(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        eid = UUID(employee_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid employee id")

    emp_res = await db.execute(select(Employee).where(Employee.id == eid))
    emp = emp_res.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    scores_res = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == eid)
    )
    
    skills_data = []
    for score, skill in scores_res.all():
        skills_data.append({
            "name": skill.canonical_name,
            "proficiency": score.proficiency_score,
            "domain": skill.domain
        })
        
    analysis = GeminiService.analyze_skill_profile(skills_data, emp.job_title or "Professional")
    
    return {
        "analysis": analysis,
        "current_skills_count": len(skills_data)
    }
