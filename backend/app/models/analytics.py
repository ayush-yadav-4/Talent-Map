"""Read-only ORM mappings for reporting joins (tables created in initial migration)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func, JSON
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    canonical_name: Mapped[str] = mapped_column(String(500), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(100))
    is_compliance: Mapped[bool] = mapped_column(Boolean, server_default="false")
    embedding: Mapped[Any] = mapped_column(Vector(768), nullable=True, deferred=True)


class RoleProfile(Base):
    __tablename__ = "role_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True
    )
    dept_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    job_title: Mapped[str] = mapped_column(String(255), nullable=False)
    esco_occupation_uri: Mapped[str | None] = mapped_column(Text)
    sector: Mapped[str | None] = mapped_column(String(50))
    seniority_level: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    is_template: Mapped[bool] = mapped_column(Boolean, server_default="false")
    calibrated_from_top_performers: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EmployeeSkillScore(Base):
    __tablename__ = "employee_skill_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False
    )
    proficiency_score: Mapped[float | None] = mapped_column(Float)
    proficiency_level: Mapped[str | None] = mapped_column(String(20))
    confidence: Mapped[float | None] = mapped_column(Float, server_default="0.0")
    evidence_count: Mapped[int | None] = mapped_column(Integer, server_default="0")
    self_rating: Mapped[float | None] = mapped_column(Float)
    self_rating_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    self_rating_note: Mapped[str | None] = mapped_column(Text)
    certification_name: Mapped[str | None] = mapped_column(String(500))
    certification_expiry: Mapped[date | None] = mapped_column(Date)
    is_expired: Mapped[bool] = mapped_column(Boolean, server_default="false")
    years_of_experience: Mapped[float | None] = mapped_column(Float)
    last_computed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SkillGap(Base):
    __tablename__ = "skill_gaps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    role_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("role_profiles.id", ondelete="CASCADE"), nullable=False
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False
    )
    required_proficiency: Mapped[float] = mapped_column(Float, nullable=False)
    current_proficiency: Mapped[float] = mapped_column(Float, server_default="0.0")
    gap_magnitude: Mapped[float] = mapped_column(Float, nullable=False)
    criticality: Mapped[str | None] = mapped_column(String(20))
    priority_score: Mapped[float | None] = mapped_column(Float)
    urgency_factor: Mapped[float | None] = mapped_column(Float, server_default="1.0")
    status: Mapped[str | None] = mapped_column(String(30), server_default="open")


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)


class RoleRequiredSkill(Base):
    __tablename__ = "role_required_skills"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    role_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("role_profiles.id", ondelete="CASCADE"), nullable=False
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False
    )
    required_proficiency: Mapped[float] = mapped_column(Float, nullable=False)
    criticality: Mapped[str] = mapped_column(String(20), server_default="important")  # essential, important, nice_to_have
    is_compliance: Mapped[bool] = mapped_column(Boolean, server_default="false")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), server_default="mcq")  # mcq, sjt, scenario, open_text
    options: Mapped[list | None] = mapped_column(JSON)  # List of objects: {id, text, is_correct, misconception_targeted}
    correct_answer_id: Mapped[str | None] = mapped_column(String(50))
    explanation: Mapped[str | None] = mapped_column(Text)
    
    # IRT Parameters
    a_param: Mapped[float] = mapped_column(Float, server_default="1.0")  # Discrimination
    b_param: Mapped[float] = mapped_column(Float, server_default="0.0")  # Difficulty
    c_param: Mapped[float] = mapped_column(Float, server_default="0.25") # Guessing (default for 4-option MCQ)
    
    # Metadata
    bloom_level: Mapped[str | None] = mapped_column(String(20)) # remember, understand, apply, analyze, evaluate, create
    audience_type: Mapped[str | None] = mapped_column(String(50)) # technical, non_technical, government, clinical, frontline
    sector: Mapped[str | None] = mapped_column(String(50))
    calibration_status: Mapped[str] = mapped_column(String(20), server_default="draft") # draft, sme_approved, pilot, operational, retired
    exposure_count: Mapped[int] = mapped_column(Integer, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str | None] = mapped_column(String(20), server_default="not_started")
    
    # CAT State
    current_theta: Mapped[float] = mapped_column(Float, server_default="0.0")
    current_se: Mapped[float] = mapped_column(Float, server_default="1.0")
    questions_served: Mapped[int] = mapped_column(Integer, server_default="0")
    administered_question_ids: Mapped[list] = mapped_column(ARRAY(UUID(as_uuid=True)), server_default="{}")
    
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    final_proficiency: Mapped[float | None] = mapped_column(Float)
    final_se: Mapped[float | None] = mapped_column(Float)
    time_taken_seconds: Mapped[int | None] = mapped_column(Integer)
    response_pattern_flag: Mapped[bool] = mapped_column(Boolean, server_default="false")


class AssessmentResponse(Base):
    __tablename__ = "assessment_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessment_sessions.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    selected_option_id: Mapped[str | None] = mapped_column(String(50))
    open_text_response: Mapped[str | None] = mapped_column(Text)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    response_time_seconds: Mapped[float | None] = mapped_column(Float)
    
    # Step-by-step theta update
    theta_before: Mapped[float | None] = mapped_column(Float)
    theta_after: Mapped[float | None] = mapped_column(Float)
    se_before: Mapped[float | None] = mapped_column(Float)
    se_after: Mapped[float | None] = mapped_column(Float)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SkillEvidence(Base):
    __tablename__ = "skill_evidence"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(String(50), nullable=False) 
    # assessment, github, jira, sync_meeting, perf_review, clinical_record, machine_log, self_declared, etc.
    
    proficiency_raw: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_weight: Mapped[float] = mapped_column(Float, nullable=False) # source-specific constant
    decay_half_life_days: Mapped[int] = mapped_column(Integer, nullable=False)
    
    evidence_snippet: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
