"""Read-only ORM mappings for reporting joins (tables created in initial migration)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    canonical_name: Mapped[str] = mapped_column(String(500), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(100))
    is_compliance: Mapped[bool] = mapped_column(Boolean, server_default="false")
    embedding: Mapped[Any] = mapped_column(Vector(384), nullable=True, deferred=True)


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


class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str | None] = mapped_column(String(20), server_default="not_started")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    final_proficiency: Mapped[float | None] = mapped_column(Float)
