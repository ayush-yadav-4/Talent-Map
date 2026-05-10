from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class HireVsUpskillAnalysis(Base):
    __tablename__ = "hire_vs_upskill_analyses"

    id = Column(Integer, primary_key=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id"), nullable=True)
    jd_gap_analysis_id = Column(Integer, ForeignKey("jd_gap_analyses.id"), nullable=True)
    gap_name = Column(String(200), nullable=False)
    gap_description = Column(Text, nullable=True)
    
    upskill_candidate_ids = Column(JSON, default=list)
    
    recommendation = Column(String(50), nullable=True)
    recommendation_confidence = Column(Float, nullable=True)
    
    upskill_total_cost = Column(Float, nullable=True)
    hire_total_cost = Column(Float, nullable=True)
    upskill_time_to_proficiency_weeks = Column(Integer, nullable=True)
    hire_time_to_proficiency_weeks = Column(Integer, nullable=True)
    
    upskill_breakeven_months = Column(Float, nullable=True)
    
    org_cost_factors_id = Column(Integer, ForeignKey("org_cost_factors.id"), nullable=True)
    assumptions_json = Column(JSON, default=dict)
    recommendation_reasoning = Column(Text, nullable=True)
    
    upskill_details = relationship("UpskillCostDetail", back_populates="analysis")
    hire_details = relationship("HireCostDetail", back_populates="analysis")
    candidate_scores = relationship("UpskillCandidateScore", back_populates="analysis")


class UpskillCostDetail(Base):
    __tablename__ = "upskill_cost_details"

    id = Column(Integer, primary_key=True)
    analysis_id = Column(Integer, ForeignKey("hire_vs_upskill_analyses.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    
    current_proficiency = Column(Float, nullable=False)
    required_proficiency = Column(Float, nullable=False)
    gap_size = Column(Float, nullable=True)
    
    base_salary_annual = Column(Float, nullable=False)
    internal_training_cost = Column(Float, nullable=True)
    external_certification_cost = Column(Float, nullable=True)
    coach_mentoring_cost = Column(Float, nullable=True)
    time_to_proficiency_weeks = Column(Integer, nullable=False)
    
    opportunity_cost = Column(Float, nullable=True)
    retention_risk_percentage = Column(Float, default=0.1)
    total_cost = Column(Float, nullable=True)
    cost_per_week = Column(Float, nullable=True)
    
    training_path = Column(Text, nullable=True)
    assumptions_json = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    analysis = relationship("HireVsUpskillAnalysis", back_populates="upskill_details")


class HireCostDetail(Base):
    __tablename__ = "hire_cost_details"

    id = Column(Integer, primary_key=True)
    analysis_id = Column(Integer, ForeignKey("hire_vs_upskill_analyses.id", ondelete="CASCADE"), nullable=False)
    
    market_salary_base = Column(Float, nullable=False)
    market_salary_total_comp = Column(Float, nullable=False)
    market_availability_score = Column(Float, nullable=True)
    estimated_time_to_hire_weeks = Column(Integer, nullable=False)
    
    recruiter_fee_percentage = Column(Float, default=0.15)
    recruiter_fee_amount = Column(Float, nullable=True)
    background_check_cost = Column(Float, default=500)
    interview_cost = Column(Float, default=1000)
    onboarding_cost = Column(Float, nullable=True)
    
    year_1_total_cost = Column(Float, nullable=True)
    year_2_total_cost = Column(Float, nullable=True)
    
    market_source = Column(String(100), nullable=True)
    role_demand_level = Column(String(50), nullable=True)
    assumptions_json = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    analysis = relationship("HireVsUpskillAnalysis", back_populates="hire_details")


class UpskillCandidateScore(Base):
    __tablename__ = "upskill_candidate_scores"

    id = Column(Integer, primary_key=True)
    analysis_id = Column(Integer, ForeignKey("hire_vs_upskill_analyses.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    current_skill_fit = Column(Float, nullable=False)
    learning_velocity = Column(Float, nullable=False)
    motivation_signal = Column(Float, nullable=False)
    team_fit = Column(Float, nullable=False)
    time_availability = Column(Float, nullable=False)
    
    overall_suitability_score = Column(Float, nullable=True)
    rank_among_candidates = Column(Integer, nullable=True)
    
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    analysis = relationship("HireVsUpskillAnalysis", back_populates="candidate_scores")


class OrgCostFactors(Base):
    __tablename__ = "org_cost_factors"

    id = Column(Integer, primary_key=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    internal_training_cost_per_hour = Column(Float, default=50)
    coaching_cost_per_hour = Column(Float, default=100)
    opportunity_cost_percentage = Column(Float, default=0.5)
    average_time_to_proficiency_weeks = Column(Integer, default=8)
    retention_risk_after_training_pct = Column(Float, default=0.1)
    
    recruiter_fee_percentage = Column(Float, default=0.15)
    background_check_cost = Column(Float, default=500)
    average_time_to_hire_weeks = Column(Integer, default=6)
    benefits_multiplier = Column(Float, default=1.35)
    
    prefer_upskill = Column(Boolean, default=False)
    prefer_hire = Column(Boolean, default=False)
    breakeven_threshold_months = Column(Integer, default=24)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    

class AnalysisAuditLog(Base):
    __tablename__ = "analysis_audit_logs"

    id = Column(Integer, primary_key=True)
    analysis_id = Column(Integer, ForeignKey("hire_vs_upskill_analyses.id", ondelete="CASCADE"), nullable=False)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    field_name = Column(String(100), nullable=True)
    old_value = Column(String(500), nullable=True)
    new_value = Column(String(500), nullable=True)
    reason = Column(Text, nullable=True)
