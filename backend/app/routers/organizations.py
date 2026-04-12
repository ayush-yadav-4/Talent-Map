from __future__ import annotations

import secrets
import string
import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models.analytics import RoleProfile
from app.models.department import Department
from app.models.employee import Employee
from app.models.integration_config import IntegrationConfig
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import (
    DepartmentResponse,
    InviteEmployeeRequest,
    OrgResponse,
    OrgSetupStep2,
    OrgSetupStep3,
    OrgSetupStep4,
)
from app.utils.security import hash_password

router = APIRouter()


def _parse_org_id(org_id: str) -> UUID:
    try:
        return UUID(org_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org id") from exc


def _ensure_org_access(org_uuid: UUID, user: User) -> None:
    if org_uuid != user.org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


def _temp_password() -> str:
    alphabet = string.ascii_letters + string.digits
    return "SR-" + "".join(secrets.choice(alphabet) for _ in range(8))


async def _upsert_integration(
    db: AsyncSession,
    org_id: UUID,
    integration_type: str,
    enabled: bool,
    config: dict,
) -> None:
    result = await db.execute(
        select(IntegrationConfig).where(
            IntegrationConfig.org_id == org_id,
            IntegrationConfig.integration_type == integration_type,
        )
    )
    row = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if row:
        row.is_enabled = enabled
        row.config = config or {}
        row.last_sync_status = "pending_setup" if enabled else None
        row.updated_at = now
    else:
        db.add(
            IntegrationConfig(
                id=uuid.uuid4(),
                org_id=org_id,
                integration_type=integration_type,
                is_enabled=enabled,
                config=config or {},
                last_sync_status="pending_setup" if enabled else None,
                created_at=now,
                updated_at=now,
            )
        )


@router.get("/{org_id}", response_model=OrgResponse)
async def get_organization(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrgResponse:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return OrgResponse.model_validate(org)


@router.post("/{org_id}/setup/step2", response_model=dict)
async def setup_departments(
    org_id: str,
    data: OrgSetupStep2,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    created: list[dict[str, str]] = []
    for dept_data in data.departments:
        dept = Department(
            id=uuid.uuid4(),
            org_id=org_uuid,
            name=dept_data.name.strip(),
            code=dept_data.code.strip() if dept_data.code else None,
            description=dept_data.description.strip() if dept_data.description else None,
            parent_dept_id=dept_data.parent_dept_id,
            color=dept_data.color.strip() if dept_data.color else None,
        )
        db.add(dept)
        created.append({"id": str(dept.id), "name": dept.name})

    org_result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org = org_result.scalar_one_or_none()
    if org:
        org.onboarding_step = 3
    current_user.onboarding_step = 3
    return {"departments": created, "next_step": 3}


@router.post("/{org_id}/setup/step3", response_model=dict)
async def setup_role_profiles(
    org_id: str,
    data: OrgSetupStep3,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    roles = data.resolved_roles()
    if not roles:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Add at least one role")

    org_result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org = org_result.scalar_one_or_none()
    sector = (org.sector or "").strip().lower() if org else ""

    created: list[dict[str, str]] = []
    for item in roles:
        t = item.title.strip()
        if not t:
            continue
        role = RoleProfile(
            id=uuid.uuid4(),
            org_id=org_uuid,
            job_title=t,
            seniority_level=item.seniority_level.strip(),
            dept_id=item.dept_id,
            sector=sector or None,
            is_template=False,
        )
        db.add(role)
        created.append({"id": str(role.id), "job_title": t})

    if org:
        org.onboarding_step = 4
    current_user.onboarding_step = 4
    return {"role_profiles": created, "next_step": 4}


@router.post("/{org_id}/setup/step4", response_model=dict)
async def setup_integrations(
    org_id: str,
    data: OrgSetupStep4,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    org_result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org = org_result.scalar_one_or_none()
    if org:
        settings = dict(org.settings or {})
        settings["integrations"] = {
            "hris": {"enabled": data.enable_hris, "platform": data.hris_platform},
            "github": {"enabled": data.enable_github, "organization": data.github_org},
            "teams": {"enabled": data.enable_teams},
            "jira": {"enabled": data.enable_jira, "workspace_url": data.jira_workspace_url},
            "lms": {"enabled": data.enable_lms, "platform": data.lms_platform},
            "gov_hrmis": {"enabled": data.enable_gov_hrmis, "platform": data.gov_hrmis_platform},
        }
        org.settings = settings
        flag_modified(org, "settings")
        org.onboarding_step = 5

    await _upsert_integration(db, org_uuid, "hris", data.enable_hris, {"platform": data.hris_platform or ""})
    await _upsert_integration(
        db, org_uuid, "github", data.enable_github, {"organization": data.github_org or ""}
    )
    await _upsert_integration(db, org_uuid, "teams", data.enable_teams, {})
    await _upsert_integration(
        db, org_uuid, "jira", data.enable_jira, {"workspace_url": data.jira_workspace_url or ""}
    )
    await _upsert_integration(db, org_uuid, "lms", data.enable_lms, {"platform": data.lms_platform or ""})
    if org and org.sector and org.sector.lower() == "government":
        await _upsert_integration(
            db, org_uuid, "gov_hrmis", data.enable_gov_hrmis, {"platform": data.gov_hrmis_platform or ""}
        )

    current_user.onboarding_step = 5
    return {"message": "Integration preferences saved", "next_step": 5}


@router.post("/{org_id}/invite-employee", response_model=dict)
async def invite_employee(
    org_id: str,
    payload: InviteEmployeeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    role = payload.role.strip().lower()
    if role not in ("employee", "manager", "hr_manager"):
        raise HTTPException(status_code=422, detail="role must be employee, manager, or hr_manager")

    email_norm = str(payload.email).lower()
    existing = await db.execute(select(User).where(User.email == email_norm))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This email is already registered")

    temp_pw = _temp_password()
    emp = Employee(
        id=uuid.uuid4(),
        org_id=org_uuid,
        email=email_norm,
        full_name=payload.full_name.strip(),
        job_title=payload.job_title.strip() if payload.job_title else None,
        invited_at=datetime.now(timezone.utc),
    )
    db.add(emp)
    await db.flush()

    new_user = User(
        org_id=org_uuid,
        employee_id=emp.id,
        email=email_norm,
        hashed_password=hash_password(temp_pw),
        full_name=payload.full_name.strip(),
        role=role,
        is_sso=False,
        onboarding_completed=False,
        onboarding_step=1,
    )
    db.add(new_user)
    await db.flush()

    return {
        "employee_id": str(emp.id),
        "temp_password": temp_pw,
        "message": "Invite created. Employee can sign in with this temporary password; email delivery is optional in this environment.",
    }


@router.post("/{org_id}/setup/complete", response_model=dict)
async def complete_onboarding(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    org_result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org = org_result.scalar_one_or_none()
    if org:
        org.onboarding_completed = True
        org.onboarding_step = 5
    current_user.onboarding_completed = True
    current_user.onboarding_step = 5
    return {"message": "Onboarding complete", "redirect": "/hr/dashboard"}


@router.get("/{org_id}/departments", response_model=list[DepartmentResponse])
async def list_departments(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DepartmentResponse]:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    result = await db.execute(select(Department).where(Department.org_id == org_uuid))
    return [DepartmentResponse.model_validate(d) for d in result.scalars().all()]
