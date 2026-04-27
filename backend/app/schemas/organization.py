from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: Optional[str] = Field(None, max_length=10)
    description: Optional[str] = Field(None, max_length=200)
    parent_dept_id: Optional[UUID] = None
    color: Optional[str] = Field(None, max_length=20)


class DepartmentResponse(BaseModel):
    id: UUID
    org_id: UUID
    name: str
    code: Optional[str]
    description: Optional[str]
    parent_dept_id: Optional[UUID]
    color: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class OrgSetupStep2(BaseModel):
    departments: list[DepartmentCreate]


class RoleSetupItem(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    seniority_level: str = Field(..., min_length=1, max_length=50)
    dept_id: Optional[UUID] = None


class RoleProfileManage(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    seniority_level: str = Field(default="mid_level", min_length=1, max_length=50)
    dept_id: Optional[UUID] = None


class OrgSetupStep3(BaseModel):
    roles: list[RoleSetupItem] = Field(default_factory=list)
    role_titles: list[str] = Field(default_factory=list)

    def resolved_roles(self) -> list[RoleSetupItem]:
        if self.roles:
            return [r for r in self.roles if r.title.strip()]
        return [
            RoleSetupItem(title=t.strip(), seniority_level="mid_level")
            for t in self.role_titles
            if t and str(t).strip()
        ]


class OrgSetupStep4(BaseModel):
    enable_hris: bool = False
    hris_platform: Optional[str] = None
    enable_github: bool = False
    github_org: Optional[str] = None
    enable_teams: bool = False
    enable_jira: bool = False
    jira_workspace_url: Optional[str] = None
    enable_lms: bool = False
    lms_platform: Optional[str] = None
    enable_gov_hrmis: bool = False
    gov_hrmis_platform: Optional[str] = None
    skip_integrations: bool = False


class InviteEmployeeRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    job_title: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=1000)
    role: str = Field(default="employee", max_length=30)


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: Optional[str] = Field(None, max_length=100)
    client_name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=4000)
    project_type: Optional[str] = Field(None, max_length=80)
    status: str = Field(default="planning", max_length=50)
    priority: Optional[str] = Field(None, max_length=50)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None
    currency: Optional[str] = Field(None, max_length=10)
    delivery_model: Optional[str] = Field(None, max_length=80)
    tech_stack: Optional[str] = Field(None, max_length=2000)
    jd_id: Optional[UUID] = None
    deadline: Optional[date] = None
    delivery_notes: Optional[str] = None


class ProjectAssignRequest(BaseModel):
    employee_id: UUID
    position: str = Field(default="member", min_length=1, max_length=80)


class OrgResponse(BaseModel):
    id: UUID
    name: str
    sector: str
    sub_sector: Optional[str]
    country: str
    state: Optional[str]
    domain: Optional[str]
    logo_url: Optional[str]
    subscription_plan: str
    max_employees: int
    onboarding_completed: bool
    onboarding_step: int
    employee_count_range: Optional[str]
    primary_use_case: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    domain: Optional[str] = Field(None, max_length=255)
    country: Optional[str] = Field(None, max_length=10)
    state: Optional[str] = Field(None, max_length=100)
    sub_sector: Optional[str] = Field(None, max_length=100)
