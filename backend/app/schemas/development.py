from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import List, Optional, Dict, Any

class MilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    target_skills: Optional[List[str]] = []
    learning_resources: Optional[List[Dict[str, Any]]] = []
    due_date: date
    check_in_focus: Optional[str] = None

    class Config:
        extra = "allow"

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneResponse(MilestoneBase):
    id: UUID
    status: str
    outcome_score: Optional[float] = None
    completion_notes: Optional[str] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DevelopmentPlanBase(BaseModel):
    title: str
    description: Optional[str] = None
    target_role: Optional[str] = None

    class Config:
        extra = "allow"

class DevelopmentPlanCreate(DevelopmentPlanBase):
    milestones: List[MilestoneCreate]

class DevelopmentPlanResponse(DevelopmentPlanBase):
    id: UUID
    employee_id: UUID
    org_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    milestones: List[MilestoneResponse]

    class Config:
        from_attributes = True

class IDPGenerateRequest(BaseModel):
    target_role: Optional[str] = None

class MilestoneUpdate(BaseModel):
    status: Optional[str] = None
    outcome_score: Optional[float] = None
    completion_notes: Optional[str] = None
