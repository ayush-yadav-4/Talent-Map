from pydantic import BaseModel, Field


class RoleSuggestionItem(BaseModel):
    role_title: str
    fit_score: float = Field(ge=0, le=100)
    readiness_level: str
    rationale: str
    key_strengths: list[str] = Field(default_factory=list)
    skills_to_develop: list[str] = Field(default_factory=list)
    typical_timeline_months: int = Field(ge=1, le=60)
    domain: str = ""


class RoleSuggestionsEnvelope(BaseModel):
    suggestions: list[RoleSuggestionItem] = Field(default_factory=list)
    summary: str = ""


class RoadmapPhase(BaseModel):
    phase_number: int = Field(ge=1)
    title: str
    duration_weeks: int = Field(ge=1, le=52)
    objectives: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    activities: list[str] = Field(default_factory=list)
    success_criteria: str = ""


class SkillRoadmapEnvelope(BaseModel):
    target_role: str
    estimated_months: int = Field(ge=1, le=36)
    overview: str
    current_strengths: list[str] = Field(default_factory=list)
    priority_gaps: list[str] = Field(default_factory=list)
    phases: list[RoadmapPhase] = Field(default_factory=list)
    quick_wins: list[str] = Field(default_factory=list)
    recommended_certifications: list[str] = Field(default_factory=list)
    summary: str = ""


class RoadmapGenerateRequest(BaseModel):
    target_role: str = Field(..., min_length=2, max_length=255)
