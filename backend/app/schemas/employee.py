from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class EmployeeCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = None
    job_title: Optional[str] = None
    dept_id: Optional[UUID] = None
    seniority_level: Optional[str] = None
    employment_type: str = "full_time"
    grade_band: Optional[str] = None
    manager_id: Optional[UUID] = None
    date_of_joining: Optional[date] = None
    years_of_experience: Optional[float] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    cadre: Optional[str] = None
    service_type: Optional[str] = None
    posting_location: Optional[str] = None
    gov_employee_id: Optional[str] = None
    clinical_specialization: Optional[str] = None
    registration_number: Optional[str] = None


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    dept_id: Optional[UUID] = None
    seniority_level: Optional[str] = None
    employment_type: Optional[str] = None
    grade_band: Optional[str] = None
    manager_id: Optional[UUID] = None
    date_of_joining: Optional[date] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    github_handle: Optional[str] = None
    jira_username: Optional[str] = None
    highest_qualification: Optional[str] = None
    field_of_study: Optional[str] = None
    institution: Optional[str] = None
    graduation_year: Optional[str] = None


class EmployeeResponse(BaseModel):
    id: UUID
    org_id: UUID
    dept_id: Optional[UUID]
    email: str
    full_name: str
    display_name: Optional[str]
    gender: Optional[str] = None
    phone: Optional[str]
    profile_photo_url: Optional[str]
    job_title: Optional[str]
    seniority_level: Optional[str]
    employment_type: str
    grade_band: Optional[str]
    manager_id: Optional[UUID]
    date_of_joining: Optional[date]
    years_of_experience: Optional[float]
    location_city: Optional[str]
    location_state: Optional[str]
    employment_status: str
    is_active: bool
    resume_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class EmployeeOnboardingStep1(BaseModel):
    full_name: str
    display_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=30)
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    profile_photo_url: Optional[str] = None


class EmployeeOnboardingStep2(BaseModel):
    job_title: str
    dept_id: Optional[UUID] = None
    seniority_level: str
    employment_type: str = "full_time"
    date_of_joining: Optional[date] = None
    years_of_experience: Optional[float] = None
    manager_id: Optional[UUID] = None
    grade_band: Optional[str] = None
    cadre: Optional[str] = None
    service_type: Optional[str] = None
    posting_location: Optional[str] = None
    clinical_specialization: Optional[str] = None
    registration_number: Optional[str] = None


class EmployeeOnboardingStep3(BaseModel):
    highest_qualification: Optional[str] = None
    field_of_study: Optional[str] = None
    institution: Optional[str] = None
    graduation_year: Optional[str] = None
    declared_skills: Optional[list[str]] = None


class EmployeeOnboardingStep4(BaseModel):
    consent_github: bool = False
    consent_email: bool = False
    consent_teams: bool = False
    consent_slack: bool = False


class BulkEmployeeImport(BaseModel):
    employees: list[EmployeeCreate]
