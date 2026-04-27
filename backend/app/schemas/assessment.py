from __future__ import annotations
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class OptionSchema(BaseModel):
    id: str
    text: str

class QuestionSchema(BaseModel):
    id: uuid.UUID
    question_text: str
    question_type: str
    options: List[OptionSchema]
    bloom_level: Optional[str] = None
    sector: Optional[str] = None

class SessionStartRequest(BaseModel):
    assessment_id: uuid.UUID

class SessionResponse(BaseModel):
    id: uuid.UUID
    status: str
    current_theta: float
    current_se: float
    questions_served: int
    started_at: datetime
    next_question: Optional[QuestionSchema] = None

class AnswerSubmitRequest(BaseModel):
    question_id: uuid.UUID
    selected_option_id: Optional[str] = None
    open_text_response: Optional[str] = None
    response_time_seconds: float

class SessionResultSchema(BaseModel):
    id: uuid.UUID
    final_proficiency: float
    proficiency_level: str
    final_se: float
    time_taken_seconds: int
    percentile_rank: Optional[float] = None
    skills_covered: List[str]
    recommendations: List[str]

class EvidenceLogSchema(BaseModel):
    source_type: str
    source_label: str
    proficiency_raw: float
    confidence_weight: float
    observed_at: datetime
    decay_factor: float
    effective_weight: float
    evidence_snippet: Optional[str] = None
