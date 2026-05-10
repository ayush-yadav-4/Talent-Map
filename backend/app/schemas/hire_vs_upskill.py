from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class RecommendationType(str, Enum):
    HIRE = "HIRE"
    UPSKILL = "UPSKILL"
    NEUTRAL = "NEUTRAL"
    INCONCLUSIVE = "INCONCLUSIVE"


class CreateHireVsUpskillAnalysisRequest(BaseModel):
    gap_name: str = Field(..., description="Role or position name")
    gap_description: Optional[str] = None
    job_description_id: Optional[str] = None
    jd_gap_analysis_id: Optional[str] = None
    upskill_candidate_ids: List[str] = Field(default=[], description="Internal employee IDs to consider for upskilling")


class UpskillCostInput(BaseModel):
    employee_id: str
    required_proficiency: float = Field(..., ge=1.0, le=5.0)
    current_proficiency: Optional[float] = Field(None, ge=1.0, le=5.0)
    time_to_proficiency_weeks: Optional[int] = Field(default=8)
    internal_training_cost: Optional[float] = None
    external_certification_cost: Optional[float] = None
    coaching_cost: Optional[float] = None


class HireCostInput(BaseModel):
    market_salary_base: Optional[float] = None
    recruiter_fee_percentage: Optional[float] = None
    time_to_hire_weeks: Optional[int] = None


class UpdateHireVsUpskillAnalysisRequest(BaseModel):
    upskill_candidate_ids: Optional[List[str]] = None
    upskill_costs: Optional[Dict[str, UpskillCostInput]] = None
    hire_cost: Optional[HireCostInput] = None
    org_cost_factors_id: Optional[int] = None


class OrgCostFactorsRequest(BaseModel):
    internal_training_cost_per_hour: float = 50
    coaching_cost_per_hour: float = 100
    opportunity_cost_percentage: float = 0.5
    average_time_to_proficiency_weeks: int = 8
    retention_risk_after_training_pct: float = 0.1
    recruiter_fee_percentage: float = 0.15
    background_check_cost: float = 500
    average_time_to_hire_weeks: int = 6
    benefits_multiplier: float = 1.35
    prefer_upskill: bool = False
    prefer_hire: bool = False
    breakeven_threshold_months: int = 24


class UpskillCostDetailResponse(BaseModel):
    id: int
    employee_id: str
    current_proficiency: float
    required_proficiency: float
    gap_size: float
    internal_training_cost: Optional[float]
    external_certification_cost: Optional[float]
    coach_mentoring_cost: Optional[float]
    time_to_proficiency_weeks: int
    opportunity_cost: Optional[float]
    total_cost: Optional[float]
    cost_per_week: Optional[float]
    training_path: Optional[str]

    class Config:
        from_attributes = True


class HireCostDetailResponse(BaseModel):
    id: int
    market_salary_base: float
    market_salary_total_comp: float
    recruiter_fee_amount: Optional[float]
    background_check_cost: float
    interview_cost: float
    onboarding_cost: Optional[float]
    year_1_total_cost: Optional[float]
    year_2_total_cost: Optional[float]
    estimated_time_to_hire_weeks: int
    market_availability_score: Optional[float]
    role_demand_level: Optional[str]

    class Config:
        from_attributes = True


class UpskillCandidateScoreResponse(BaseModel):
    id: int
    employee_id: str
    current_skill_fit: float
    learning_velocity: float
    motivation_signal: float
    team_fit: float
    time_availability: float
    overall_suitability_score: Optional[float]
    rank_among_candidates: Optional[int]
    reasoning: Optional[str]

    class Config:
        from_attributes = True


class HireVsUpskillAnalysisResponse(BaseModel):
    id: int
    organization_id: str
    gap_name: str
    gap_description: Optional[str]
    recommendation: Optional[RecommendationType]
    recommendation_confidence: Optional[float]
    recommendation_reasoning: Optional[str]
    
    upskill_total_cost: Optional[float]
    hire_total_cost: Optional[float]
    upskill_time_to_proficiency_weeks: Optional[int]
    hire_time_to_proficiency_weeks: Optional[int]
    upskill_breakeven_months: Optional[float]
    
    upskill_details: List[UpskillCostDetailResponse] = []
    hire_details: Optional[HireCostDetailResponse] = None
    candidate_scores: List[UpskillCandidateScoreResponse] = []
    
    assumptions_json: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrgCostFactorsResponse(BaseModel):
    id: int
    organization_id: str
    internal_training_cost_per_hour: float
    coaching_cost_per_hour: float
    opportunity_cost_percentage: float
    average_time_to_proficiency_weeks: int
    retention_risk_after_training_pct: float
    recruiter_fee_percentage: float
    background_check_cost: float
    average_time_to_hire_weeks: int
    benefits_multiplier: float
    prefer_upskill: bool
    prefer_hire: bool
    breakeven_threshold_months: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
