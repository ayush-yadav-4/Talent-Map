from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Body, HTTPException
from app.services.coach_service import CoachService, _format_gaps, _format_skills
from app.services.history_service import history_service
from app.services.rag_service import rag_service
from app.deps import get_current_user
from app.models.user import User
from app.models.employee import Employee
from app.models.analytics import EmployeeSkillScore, Skill, SkillGap
from app.models.organization import Organization
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_core.messages import HumanMessage, AIMessage

router = APIRouter()
coach_service = CoachService()

@router.get("/sessions")
async def list_sessions(current_user: User = Depends(get_current_user)):
    sessions = await history_service.get_user_sessions(str(current_user.id))
    return sessions

@router.get("/sessions/{session_id}")
async def get_session(session_id: str, current_user: User = Depends(get_current_user)):
    session = await history_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    return session

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: User = Depends(get_current_user)):
    session = await history_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    await history_service.delete_session(session_id)
    return {"status": "deleted"}

@router.post("/chat")
async def coach_chat(
    message: str = Body(..., embed=True),
    session_id: Optional[str] = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id_str = str(current_user.id)
    
    # 1. Get or create session
    if not session_id:
        # Create a new session with a preview of the message as title
        title = (message[:30] + '...') if len(message) > 30 else message
        session_id = await history_service.create_session(user_id_str, title=title)
    
    session = await history_service.get_session(session_id)
    if not session:
        # Fallback if session_id was passed but not found (create new)
        session_id = await history_service.create_session(user_id_str)
        session = await history_service.get_session(session_id)

    # 2. Map existing history to LangChain objects
    prior_messages = session.get("messages", [])
    is_session_start = len(prior_messages) == 0

    langchain_history = []
    for h in prior_messages:
        if h["role"] == "user":
            langchain_history.append(HumanMessage(content=h["content"]))
        else:
            langchain_history.append(AIMessage(content=h["content"]))

    # 3. Lean employee + org context for system prompt (session start) or identity line (follow-ups)
    employee_id = current_user.employee_id
    context: Dict[str, Any] = {
        "full_name": current_user.full_name,
        "job_title": "Employee",
        "years_of_experience": None,
        "seniority_level": None,
        "skills": [],
        "gaps": [],
    }
    org_context: Dict[str, Any] = {"name": "Organization"}

    org_row = await db.execute(select(Organization.name).where(Organization.id == current_user.org_id))
    org_name = org_row.scalar_one_or_none()
    if org_name:
        org_context["name"] = org_name

    if employee_id:
        emp_res = await db.execute(select(Employee).where(Employee.id == employee_id))
        emp = emp_res.scalar_one_or_none()
        if emp:
            context["job_title"] = emp.job_title or "Employee"
            context["years_of_experience"] = emp.years_of_experience
            context["seniority_level"] = emp.seniority_level

        skills_res = await db.execute(
            select(EmployeeSkillScore, Skill)
            .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
            .where(EmployeeSkillScore.employee_id == employee_id)
            .order_by(EmployeeSkillScore.proficiency_score.desc())
        )
        for score, skill in skills_res.all():
            context["skills"].append(
                {"name": skill.canonical_name, "proficiency": float(score.proficiency_score or 0)}
            )

        gaps_res = await db.execute(
            select(SkillGap, Skill)
            .join(Skill, SkillGap.skill_id == Skill.id)
            .where(SkillGap.employee_id == employee_id, SkillGap.status == "open")
            .order_by(SkillGap.gap_magnitude.desc())
            .limit(5)
        )
        for gap, skill in gaps_res.all():
            context["gaps"].append(
                {
                    "skill": skill.canonical_name,
                    "gap_magnitude": float(gap.gap_magnitude or 0),
                    "criticality": gap.criticality,
                }
            )

    # 4. Seed RAG with a compact profile snapshot on new sessions (powers follow-up retrieval)
    if is_session_start and rag_service.is_ready and employee_id:
        years = context.get("years_of_experience")
        exp_text = f"{years} years experience" if years is not None else "experience not specified"
        profile_doc = (
            f"Profile for {context['full_name']} ({context['job_title']}) at {org_context['name']}. "
            f"{exp_text}. Skills: {_format_skills(context['skills'])}. "
            f"Open gaps: {_format_gaps(context['gaps'])}."
        )
        await rag_service.ingest_employee_data(
            str(employee_id),
            profile_doc,
            {"type": "coach_profile", "org_id": str(current_user.org_id)},
        )

    # 5. RAG retrieval on follow-up turns only
    rag_context = ""
    if not is_session_start and rag_service.is_ready and employee_id:
        rag_context = await rag_service.retrieve_employee_context(str(employee_id), message, k=4)

    # 6. Generate response
    response_text = await coach_service.chat(
        message,
        langchain_history,
        context,
        org_context=org_context,
        rag_context=rag_context,
        is_session_start=is_session_start,
    )
    
    # 7. Save to MongoDB
    await history_service.add_message(session_id, "user", message)
    await history_service.add_message(session_id, "assistant", response_text)
    
    return {
        "response": response_text,
        "session_id": session_id
    }
