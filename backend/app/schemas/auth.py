from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    sector: str = Field(min_length=3, max_length=50)
    admin_email: EmailStr
    admin_password: str = Field(min_length=8, max_length=128)
    admin_full_name: str = Field(min_length=2, max_length=255)
    sub_sector: Optional[str] = None
    country: str = "IN"
    state: Optional[str] = None
    domain: Optional[str] = None
    employee_count_range: Optional[str] = None
    primary_use_case: Optional[str] = None
    primary_use_cases: Optional[list[str]] = None
    admin_designation: Optional[str] = None
    admin_phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserPublic(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    role: str
    org_id: UUID
    employee_id: Optional[UUID]
    onboarding_completed: bool
    onboarding_step: int
    must_change_password: bool

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic
