from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.employee import Employee
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserPublic
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    safe_uuid,
    verify_password,
)

router = APIRouter()


def _max_employees_for_range(r: str | None) -> int:
    mapping = {
        "1-50": 50,
        "51-200": 200,
        "201-500": 500,
        "501-2000": 2000,
        "2000+": 10000,
    }
    return mapping.get((r or "").strip(), 100)


def _user_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        org_id=user.org_id,
        employee_id=user.employee_id,
        onboarding_completed=bool(user.onboarding_completed),
        onboarding_step=int(user.onboarding_step or 1),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_org_admin(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    email_norm = str(payload.admin_email).lower()
    existing = await db.execute(select(User).where(User.email == email_norm))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    settings: dict = {}
    if payload.primary_use_cases:
        settings["primary_use_cases"] = payload.primary_use_cases
    primary_blob: str | None = None
    if payload.primary_use_cases:
        primary_blob = json.dumps({"primary_use_cases": payload.primary_use_cases})
    elif payload.primary_use_case:
        primary_blob = payload.primary_use_case

    org = Organization(
        name=payload.organization_name.strip(),
        sector=payload.sector.strip().lower(),
        sub_sector=payload.sub_sector.strip() if payload.sub_sector else None,
        country=(payload.country or "IN").strip()[:10],
        state=payload.state.strip() if payload.state else None,
        domain=payload.domain.strip() if payload.domain else None,
        contact_name=payload.admin_full_name.strip(),
        contact_phone=payload.admin_phone.strip() if payload.admin_phone else None,
        contact_designation=payload.admin_designation.strip() if payload.admin_designation else None,
        employee_count_range=payload.employee_count_range,
        primary_use_case=primary_blob,
        max_employees=_max_employees_for_range(payload.employee_count_range),
        settings=settings,
        onboarding_step=2,
    )
    db.add(org)
    await db.flush()

    employee = Employee(
        org_id=org.id,
        email=email_norm,
        full_name=payload.admin_full_name.strip(),
        job_title="Organization Administrator",
    )
    db.add(employee)
    await db.flush()

    user = User(
        org_id=org.id,
        employee_id=employee.id,
        email=email_norm,
        hashed_password=hash_password(payload.admin_password),
        full_name=payload.admin_full_name.strip(),
        role="org_admin",
        is_sso=False,
        onboarding_completed=False,
        onboarding_step=2,
    )
    db.add(user)
    await db.flush()

    access = create_access_token(
        subject=str(user.id),
        extra_claims={"org_id": str(org.id), "role": user.role, "email": user.email},
    )
    refresh = create_refresh_token(subject=str(user.id), extra_claims={"org_id": str(org.id), "role": user.role})
    user.refresh_token = refresh
    await db.refresh(user)

    return TokenResponse(access_token=access, refresh_token=refresh, user=_user_public(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    email_norm = str(payload.email).lower()
    result = await db.execute(select(User).where(User.email == email_norm))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    access = create_access_token(
        subject=str(user.id),
        extra_claims={"org_id": str(user.org_id), "role": user.role, "email": user.email},
    )
    refresh = create_refresh_token(
        subject=str(user.id),
        extra_claims={"org_id": str(user.org_id), "role": user.role},
    )
    user.refresh_token = refresh
    user.last_login_at = datetime.now(timezone.utc)
    await db.refresh(user)

    return TokenResponse(access_token=access, refresh_token=refresh, user=_user_public(user))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    claims = decode_token(payload.refresh_token)
    if not claims or claims.get("typ") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user_id = safe_uuid(claims.get("sub"))
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or user.refresh_token != payload.refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token mismatch")

    access = create_access_token(
        subject=str(user.id),
        extra_claims={"org_id": str(user.org_id), "role": user.role, "email": user.email},
    )
    new_refresh = create_refresh_token(
        subject=str(user.id),
        extra_claims={"org_id": str(user.org_id), "role": user.role},
    )
    user.refresh_token = new_refresh
    await db.refresh(user)

    return TokenResponse(access_token=access, refresh_token=new_refresh, user=_user_public(user))


@router.get("/me", response_model=UserPublic)
async def read_me(user: Annotated[User, Depends(get_current_user)]) -> UserPublic:
    return _user_public(user)
