from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.employee import EmployeeResponse


class SkillScoreResponse(BaseModel):
    skill_id: UUID
    skill_name: str
    skill_domain: Optional[str]
    proficiency_score: float
    proficiency_level: str
    confidence: float
    evidence_count: int
    self_rating: Optional[float]
    certification_name: Optional[str]
    certification_expiry: Optional[date]
    is_expired: bool
    last_computed_at: datetime


class GapResponse(BaseModel):
    skill_id: UUID
    skill_name: str
    skill_domain: Optional[str]
    required_proficiency: float
    current_proficiency: float
    gap_magnitude: float
    criticality: str
    priority_score: float
    urgency_factor: float
    is_compliance: bool
    status: str


class EmployeeProfileResponse(BaseModel):
    employee: EmployeeResponse
    skill_scores: list[SkillScoreResponse]
    gaps: list[GapResponse]
    total_skills: int
    avg_proficiency: float
    critical_gaps: int
    expiring_certs: int


class DashboardStats(BaseModel):
    total_employees: int
    active_employees: int
    employees_assessed: int
    avg_org_proficiency: float
    total_critical_gaps: int
    total_open_gaps: int = 0
    high_risk_employees: int = 0
    certs_expiring_30_days: int
    certs_expiring_60_days: int
    certs_expiring_90_days: int
    expired_certifications: int = 0
    assessments_completed_this_month: int
    assessments_pending: int = 0
    top_skill_gaps: list[dict] = Field(default_factory=list)
    dept_gap_heatmap: list[dict] = Field(default_factory=list)
    recent_activity: list[dict] = Field(default_factory=list)
    certification_alerts: list[dict] = Field(default_factory=list)
