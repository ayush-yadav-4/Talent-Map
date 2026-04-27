import os
from typing import Annotated, List, Dict, Any, Union
from typing_extensions import TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from app.config import settings

# Define the state for our coach graph
class CoachState(TypedDict):
    messages: Annotated[List[BaseMessage], "The messages in the conversation"]
    employee_context: Dict[str, Any]
    org_context: Dict[str, Any]

class CoachService:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model or "gemini-1.5-flash",
            google_api_key=settings.gemini_api_key,
            temperature=0.7
        )
        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(CoachState)

        def coach_node(state: CoachState):
            messages = state["messages"]
            emp_ctx = state["employee_context"]
            
            # Construct system prompt with context
            system_prompt = f"""
            You are the TalentMap AI Coach. Your goal is to provide career guidance, skill development advice, 
            and professional feedback to employees.
            
            Employee Context:
            - Name: {emp_ctx.get('full_name')}
            - Job Title: {emp_ctx.get('job_title')}
            - Top Skills: {', '.join([s['name'] for s in emp_ctx.get('skills', [])[:5]])}
            - Recent Gaps: {', '.join([g['skill'] for g in emp_ctx.get('gaps', [])[:3]])}
            
            Instructions:
            1. Be professional, encouraging, and data-driven.
            2. Refer to the employee's specific skills and gaps when giving advice.
            3. Suggest specific learning actions or assessment steps.
            4. Keep responses concise but impactful.
            """
            
            all_messages = [SystemMessage(content=system_prompt)] + messages
            response = self.llm.invoke(all_messages)
            return {"messages": [response]}

        workflow.add_node("coach", coach_node)
        workflow.set_entry_point("coach")
        workflow.add_edge("coach", END)

        return workflow.compile()

    async def chat(self, user_message: str, history: List[BaseMessage], employee_context: Dict[str, Any]) -> str:
        state = {
            "messages": history + [HumanMessage(content=user_message)],
            "employee_context": employee_context,
            "org_context": {}
        }
        
        result = await self.graph.ainvoke(state)
        return result["messages"][-1].content
