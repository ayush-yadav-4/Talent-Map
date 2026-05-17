from typing import Annotated, List, Dict, Any
from typing_extensions import TypedDict

from fastapi import HTTPException
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from app.config import settings


class CoachState(TypedDict):
    messages: Annotated[List[BaseMessage], "The messages in the conversation"]
    employee_context: Dict[str, Any]
    org_context: Dict[str, Any]
    rag_context: str
    is_session_start: bool


def _format_skills(skills: List[Dict[str, Any]], limit: int = 8) -> str:
    if not skills:
        return "none recorded"
    parts = []
    for s in skills[:limit]:
        name = s.get("name") or s.get("skill_name") or "Unknown"
        prof = s.get("proficiency")
        parts.append(f"{name} ({prof}/5)" if prof is not None else name)
    return ", ".join(parts)


def _format_gaps(gaps: List[Dict[str, Any]], limit: int = 4) -> str:
    if not gaps:
        return "none flagged"
    parts = []
    for g in gaps[:limit]:
        skill = g.get("skill") or g.get("skill_name") or "Unknown"
        mag = g.get("gap_magnitude")
        parts.append(f"{skill} (gap {mag:.1f})" if mag is not None else skill)
    return ", ".join(parts)


def build_coach_system_prompt(
    employee_context: Dict[str, Any],
    org_context: Dict[str, Any],
    *,
    rag_context: str = "",
    is_session_start: bool = False,
) -> str:
    """Compact system prompt: rich profile on session start; RAG-only on follow-ups."""
    name = employee_context.get("full_name") or "Employee"
    org_name = org_context.get("name") or "their organization"
    job_title = employee_context.get("job_title") or "Employee"
    years = employee_context.get("years_of_experience")
    seniority = employee_context.get("seniority_level")
    skills_line = _format_skills(employee_context.get("skills") or [])
    gaps_line = _format_gaps(employee_context.get("gaps") or [])

    if is_session_start:
        experience = f"{years} years" if years is not None else "not specified"
        seniority_bit = f", {seniority}" if seniority else ""
        return (
            "You are TalentMap AI Coach — a professional career and skills advisor.\n"
            f"Employee: {name} | Role: {job_title}{seniority_bit} | Organization: {org_name}\n"
            f"Experience: {experience}\n"
            f"Top skills: {skills_line}\n"
            f"Priority gaps: {gaps_line}\n"
            "Use this profile for personalized advice. Be concise, encouraging, and actionable. "
            "Suggest concrete learning or assessment steps when relevant."
        )

    rag_block = rag_context.strip()
    rag_section = (
        f"\nRetrieved context (use for this reply):\n{rag_block}\n"
        if rag_block
        else ""
    )
    return (
        "You are TalentMap AI Coach continuing an existing conversation.\n"
        f"Employee: {name} ({job_title}) at {org_name}.\n"
        "Answer using conversation history"
        + (" and the retrieved context below." if rag_block else ".")
        + " Do not repeat the full profile unless asked."
        + rag_section
    )

class CoachService:
    """AI Coach; LLM is loaded only when GEMINI_API_KEY / GOOGLE_API_KEY is set."""

    def __init__(self) -> None:
        self.llm = None
        self.graph = None
        key = (settings.gemini_api_key or "").strip()
        if not key:
            return
        self.llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model or "gemini-1.5-flash",
            google_api_key=key,
            temperature=0.7,
        )
        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(CoachState)

        def coach_node(state: CoachState):
            messages = state["messages"]
            system_prompt = build_coach_system_prompt(
                state["employee_context"],
                state.get("org_context") or {},
                rag_context=state.get("rag_context") or "",
                is_session_start=bool(state.get("is_session_start")),
            )
            all_messages = [SystemMessage(content=system_prompt)] + messages
            response = self.llm.invoke(all_messages)
            return {"messages": [response]}

        workflow.add_node("coach", coach_node)
        workflow.set_entry_point("coach")
        workflow.add_edge("coach", END)

        return workflow.compile()

    async def chat(
        self,
        user_message: str,
        history: List[BaseMessage],
        employee_context: Dict[str, Any],
        org_context: Dict[str, Any] | None = None,
        rag_context: str = "",
        is_session_start: bool = False,
    ) -> str:
        if self.graph is None or self.llm is None:
            raise HTTPException(
                status_code=503,
                detail=(
                    "AI Coach requires a Gemini API key. Add GEMINI_API_KEY or GOOGLE_API_KEY "
                    "to backend/.env (create a key at https://aistudio.google.com/apikey)."
                ),
            )
        state = {
            "messages": history + [HumanMessage(content=user_message)],
            "employee_context": employee_context,
            "org_context": org_context or {},
            "rag_context": rag_context,
            "is_session_start": is_session_start,
        }

        result = await self.graph.ainvoke(state)
        return result["messages"][-1].content
