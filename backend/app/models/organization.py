import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sector: Mapped[str] = mapped_column(String(50), nullable=False)
    sub_sector: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(10), server_default="IN")
    state: Mapped[str | None] = mapped_column(String(100))
    logo_url: Mapped[str | None] = mapped_column(Text)
    domain: Mapped[str | None] = mapped_column(String(255))
    subscription_plan: Mapped[str] = mapped_column(String(50), server_default="trial")
    max_employees: Mapped[int] = mapped_column(Integer, server_default="100")
    settings: Mapped[dict] = mapped_column(JSONB, server_default="{}")
    data_residency: Mapped[str] = mapped_column(String(50), server_default="cloud")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    onboarding_completed: Mapped[bool] = mapped_column(Boolean, server_default="false")
    onboarding_step: Mapped[int] = mapped_column(Integer, server_default="1")
    contact_name: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(20))
    contact_designation: Mapped[str | None] = mapped_column(String(255))
    employee_count_range: Mapped[str | None] = mapped_column(String(50))
    primary_use_case: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    departments = relationship("Department", back_populates="organization", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="organization")
