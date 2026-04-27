from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Body, HTTPException
from app.services.coach_service import CoachService
from app.services.history_service import history_service
from app.deps import get_current_user
from app.models.user import User
from app.models.employee import Employee
from app.models.analytics import EmployeeSkillScore, Skill
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
    langchain_history = []
    for h in session.get("messages", []):
        if h["role"] == "user":
            langchain_history.append(HumanMessage(content=h["content"]))
        else:
            langchain_history.append(AIMessage(content=h["content"]))

    # 3. Fetch context (Skills, Gaps, etc.)
    employee_id = current_user.employee_id
    context = {
        "full_name": current_user.full_name,
        "job_title": "Employee",
        "skills": [],
        "gaps": []
    }
    
    if employee_id:
        emp_res = await db.execute(select(Employee).where(Employee.id == employee_id))
        emp = emp_res.scalar_one_or_none()
        if emp:
            context["job_title"] = emp.job_title or "Employee"
            
        skills_res = await db.execute(
            select(EmployeeSkillScore, Skill)
            .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
            .where(EmployeeSkillScore.employee_id == employee_id)
        )
        for score, skill in skills_res.all():
            context["skills"].append({"name": skill.canonical_name, "proficiency": score.proficiency_score})

    # 4. Generate response
    response_text = await coach_service.chat(message, langchain_history, context)
    
    # 5. Save to MongoDB
    await history_service.add_message(session_id, "user", message)
    await history_service.add_message(session_id, "assistant", response_text)
    
    return {
        "response": response_text,
        "session_id": session_id
    }
