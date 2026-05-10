from __future__ import annotations

import uuid
from datetime import datetime, date
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.organization import Organization

class DevelopmentPlan(Base):
    __tablename__ = "development_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_role: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    status: Mapped[str] = mapped_column(String(50), default="active") # active, completed, archived
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", backref="development_plans")
    milestones = relationship("DevelopmentMilestone", back_populates="plan", cascade="all, delete-orphan", order_by="DevelopmentMilestone.due_date")

class DevelopmentMilestone(Base):
    __tablename__ = "development_milestones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("development_plans.id", ondelete="CASCADE"), nullable=False)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    target_skills: Mapped[List[str]] = mapped_column(JSON, default=list) # List of skill names
    learning_resources: Mapped[List[dict]] = mapped_column(JSON, default=list) # [{title, url, type}]
    check_in_focus: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending") # pending, in_progress, completed, missed
    
    outcome_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # 0-100 after completion
    completion_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    plan = relationship("DevelopmentPlan", back_populates="milestones")
