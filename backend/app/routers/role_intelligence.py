import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.deps import get_current_user
from app.models.analytics import RoleProfile
from app.models.job_description import JobDescription
from app.models.user import User
from app.services.gemini_service import GeminiService, RoleExtractionResult

router = APIRouter()

class JDExtractionRequest(BaseModel):
    jd_text: str

class SaveRoleRequest(BaseModel):
    extraction: RoleExtractionResult
    dept_id: Optional[uuid.UUID] = None

@router.post("/extract", response_model=RoleExtractionResult)
async def extract_role_skills(
    req: JDExtractionRequest,
    current_user: User = Depends(get_current_user)
):
    if not req.jd_text.strip():
        raise HTTPException(status_code=400, detail="JD text is empty")
    
    result = GeminiService.extract_skills_from_jd(req.jd_text)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to analyze JD")
    
    return result

@router.post("/create", response_model=dict)
async def create_role_profile(
    req: SaveRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("org_admin", "hr_manager"):
        raise HTTPException(status_code=403, detail="Not authorized to save role")

    role_summary = (req.extraction.role_summary or req.extraction.description_summary or "").strip()
    qualification = (req.extraction.qualification or "").strip()
    responsibilities = (req.extraction.responsibilities or "").strip()
    key_deliverables = (req.extraction.key_deliverables or "").strip()
    stakeholders = (req.extraction.stakeholders or "").strip()
    success_metrics = (req.extraction.success_metrics or "").strip()

    requirements_lines = []
    if qualification:
        requirements_lines.append(f"Qualification / Eligibility:\n{qualification}")
    if stakeholders:
        requirements_lines.append(f"Key Stakeholders:\n{stakeholders}")
    if key_deliverables:
        requirements_lines.append(f"Key Deliverables:\n{key_deliverables}")
    if success_metrics:
        requirements_lines.append(f"Success Metrics:\n{success_metrics}")
    requirements_lines.append("Required Skills:")
    requirements_lines.extend(
        [
            f"- {skill.skill_name} (min {skill.min_proficiency}/5, {skill.importance})"
            for skill in req.extraction.required_skills
        ]
    )

    jd = JobDescription(
        id=uuid.uuid4(),
        org_id=current_user.org_id,
        title=req.extraction.job_title,
        role_type=req.extraction.role_type_category or "General",
        domain=req.extraction.domain,
        summary=role_summary,
        responsibilities=responsibilities or None,
        requirements="\n".join(requirements_lines),
        structured_skills=req.extraction.model_dump(),
    )
    db.add(jd)
    await db.commit()
    await db.refresh(jd)
    return {"success": True, "jd_id": str(jd.id), "title": jd.title}

@router.get("/list", response_model=List[dict])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(RoleProfile).where(RoleProfile.org_id == current_user.org_id))
    roles = result.scalars().all()
    return [{"id": r.id, "job_title": r.job_title, "description": r.description} for r in roles]
