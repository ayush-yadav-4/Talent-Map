import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    dept_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL")
    )

    employee_code: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255))
    gender: Mapped[str | None] = mapped_column(String(30))

    job_title: Mapped[str | None] = mapped_column(String(255))
    esco_occupation_uri: Mapped[str | None] = mapped_column(Text)
    seniority_level: Mapped[str | None] = mapped_column(String(50))
    employment_type: Mapped[str] = mapped_column(String(50), server_default="full_time")
    grade_band: Mapped[str | None] = mapped_column(String(50))

    cadre: Mapped[str | None] = mapped_column(String(100))
    service_type: Mapped[str | None] = mapped_column(String(100))
    posting_location: Mapped[str | None] = mapped_column(String(255))

    clinical_specialization: Mapped[str | None] = mapped_column(String(255))
    registration_number: Mapped[str | None] = mapped_column(String(100))

    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL")
    )

    github_handle: Mapped[str | None] = mapped_column(String(100))
    jira_username: Mapped[str | None] = mapped_column(String(100))
    teams_user_id: Mapped[str | None] = mapped_column(String(255))
    slack_user_id: Mapped[str | None] = mapped_column(String(100))
    hris_employee_id: Mapped[str | None] = mapped_column(String(100))
    gov_employee_id: Mapped[str | None] = mapped_column(String(100))
    hospital_staff_id: Mapped[str | None] = mapped_column(String(100))

    profile_photo_url: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(20))
    date_of_joining: Mapped[date | None] = mapped_column(Date)
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    years_of_experience: Mapped[float | None] = mapped_column(Float)
    location_city: Mapped[str | None] = mapped_column(String(100))
    location_state: Mapped[str | None] = mapped_column(String(100))

    highest_qualification: Mapped[str | None] = mapped_column(String(100))
    field_of_study: Mapped[str | None] = mapped_column(String(255))
    institution: Mapped[str | None] = mapped_column(String(255))
    graduation_year: Mapped[str | None] = mapped_column(String(10))

    resume_url: Mapped[str | None] = mapped_column(Text)
    resume_parsed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    consent_github: Mapped[bool] = mapped_column(Boolean, server_default="false")
    consent_email: Mapped[bool] = mapped_column(Boolean, server_default="false")
    consent_teams: Mapped[bool] = mapped_column(Boolean, server_default="false")
    consent_slack: Mapped[bool] = mapped_column(Boolean, server_default="false")
    consent_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    employment_status: Mapped[str] = mapped_column(String(20), server_default="active")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    invited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    onboarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", back_populates="employees", foreign_keys=[org_id])
    department = relationship("Department", back_populates="employees", foreign_keys=[dept_id])
