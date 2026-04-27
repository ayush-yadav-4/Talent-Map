from __future__ import annotations

import logging
import secrets
import string
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from urllib.parse import urlencode
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.config import settings
from app.models.analytics import RoleProfile
from app.models.department import Department
from app.models.employee import Employee
from app.models.integration_config import IntegrationConfig
from app.models.organization import Organization
from app.models.project import Project, ProjectAssignment
from app.models.user import User
from app.schemas.organization import (
    DepartmentCreate,
    DepartmentResponse,
    InviteEmployeeRequest,
    OrgResponse,
    OrgSetupStep2,
    OrgSetupStep3,
    OrgSetupStep4,
    OrganizationUpdate,
    ProjectAssignRequest,
    ProjectCreate,
    RoleProfileManage,
)
from app.utils.emailer import send_invite_email
from app.utils.security import hash_password

router = APIRouter()
logger = logging.getLogger(__name__)


def _parse_org_id(org_id: str) -> UUID:
    try:
        return UUID(org_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid org id") from exc


def _ensure_org_access(org_uuid: UUID, user: User) -> None:
    if org_uuid != user.org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


def _parse_uuid_or_422(raw_value: str, label: str) -> UUID:
    try:
        return UUID(raw_value)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid {label}") from exc


def _project_to_response(project: Project, assignments: list[dict[str, str | None]]) -> dict:
    return {
        "id": str(project.id),
        "name": project.name,
        "code": project.code,
        "client_name": project.client_name,
        "description": project.description,
        "project_type": project.project_type,
        "status": project.status,
        "priority": project.priority,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "budget": float(project.budget) if project.budget is not None else None,
        "currency": project.currency,
        "delivery_model": project.delivery_model,
        "tech_stack": project.tech_stack,
        "deadline": project.deadline.isoformat() if project.deadline else None,
        "delivery_notes": project.delivery_notes,
        "jd_id": str(project.jd_id) if project.jd_id else None,
        "assignments": assignments,
    }


def _temp_password() -> str:
    alphabet = string.ascii_letters + string.digits
    return "SR-" + "".join(secrets.choice(alphabet) for _ in range(8))


def _employee_login_base_url() -> str:
    base = (settings.app_login_url or "").strip()
    if not base:
        return "http://localhost:3000/employee/login"
    normalized = base.rstrip("/")
    if normalized.endswith("/employee/login"):
        return normalized
    if normalized.endswith("/login"):
        return normalized[: -len("/login")] + "/employee/login"
    return normalized + "/employee/login"


async def _refresh_employee_project_status(db: AsyncSession, employee_id: UUID) -> None:
    assignment_result = await db.execute(
        select(ProjectAssignment.id).where(ProjectAssignment.employee_id == employee_id).limit(1)
    )
    has_assignment = assignment_result.scalar_one_or_none() is not None
    employee_result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = employee_result.scalar_one_or_none()
    if not employee:
        return
    employee.project_status = "allocated" if has_assignment else "bench"


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


@router.put("/{org_id}", response_model=OrgResponse)
async def update_organization(
    org_id: str,
    payload: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> OrgResponse:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] is not None:
        org.name = updates["name"].strip()
    if "domain" in updates:
        org.domain = updates["domain"].strip() if updates["domain"] else None
    if "country" in updates and updates["country"] is not None:
        org.country = updates["country"].strip()[:10]
    if "state" in updates:
        org.state = updates["state"].strip() if updates["state"] else None
    if "sub_sector" in updates:
        org.sub_sector = updates["sub_sector"].strip() if updates["sub_sector"] else None

    await db.flush()
    await db.refresh(org)
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
    logger.info("org.setup.step2.start org_id=%s user_id=%s", org_uuid, current_user.id)

    normalized: list = []
    seen_names: set[str] = set()
    for dept_data in data.departments:
        name = dept_data.name.strip()
        if len(name) < 2:
            continue
        key = name.lower()
        if key in seen_names:
            continue
        seen_names.add(key)
        normalized.append(dept_data)
    if not normalized:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Add at least one department")

    # Keep onboarding idempotent: replace existing departments/role profiles when user re-saves step 2.
    await db.execute(delete(RoleProfile).where(RoleProfile.org_id == org_uuid, RoleProfile.is_template.is_(False)))
    await db.execute(delete(Department).where(Department.org_id == org_uuid))

    created: list[dict[str, str]] = []
    for dept_data in normalized:
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
    logger.info("org.setup.step2.success org_id=%s department_count=%s", org_uuid, len(created))
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
    logger.info("org.setup.step3.start org_id=%s user_id=%s", org_uuid, current_user.id)

    roles = data.resolved_roles()
    if not roles:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Add at least one role")

    org_result = await db.execute(select(Organization).where(Organization.id == org_uuid))
    org = org_result.scalar_one_or_none()
    sector = (org.sector or "").strip().lower() if org else ""
    dept_rows = await db.execute(select(Department.id).where(Department.org_id == org_uuid))
    valid_dept_ids = {row[0] for row in dept_rows.all()}

    # Keep onboarding idempotent for retries on step 3.
    await db.execute(delete(RoleProfile).where(RoleProfile.org_id == org_uuid, RoleProfile.is_template.is_(False)))

    created: list[dict[str, str]] = []
    seen_titles: set[str] = set()
    for item in roles:
        t = item.title.strip()
        if not t:
            continue
        key = t.lower()
        if key in seen_titles:
            continue
        seen_titles.add(key)
        role = RoleProfile(
            id=uuid.uuid4(),
            org_id=org_uuid,
            job_title=t,
            seniority_level=item.seniority_level.strip(),
            dept_id=item.dept_id if item.dept_id in valid_dept_ids else None,
            sector=sector or None,
            is_template=False,
        )
        db.add(role)
        created.append({"id": str(role.id), "job_title": t})

    if not created:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Add at least one role")

    if org:
        org.onboarding_step = 4
    current_user.onboarding_step = 4
    logger.info("org.setup.step3.success org_id=%s role_count=%s", org_uuid, len(created))
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
        notes=payload.notes.strip() if payload.notes else None,
        project_status="bench",
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
        must_change_password=True,
    )
    db.add(new_user)
    await db.flush()

    org_name_result = await db.execute(select(Organization.name).where(Organization.id == org_uuid))
    org_name = org_name_result.scalar_one_or_none() or "your organization"
    invite_login_url = f"{_employee_login_base_url()}?{urlencode({'email': email_norm, 'org': org_name, 'org_id': str(org_uuid)})}"
    email_sent, email_error = send_invite_email(
        recipient_email=email_norm,
        organization_name=org_name,
        temp_password=temp_pw,
        login_url=invite_login_url,
    )

    return {
        "employee_id": str(emp.id),
        "temp_password": temp_pw,
        "login_url": invite_login_url,
        "email_sent": email_sent,
        "email_error": email_error,
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


@router.post("/{org_id}/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    org_id: str,
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> DepartmentResponse:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    dept = Department(
        id=uuid.uuid4(),
        org_id=org_uuid,
        name=payload.name.strip(),
        code=payload.code.strip() if payload.code else None,
        description=payload.description.strip() if payload.description else None,
        parent_dept_id=payload.parent_dept_id,
        color=payload.color.strip() if payload.color else None,
    )
    db.add(dept)
    await db.flush()
    await db.refresh(dept)
    return DepartmentResponse.model_validate(dept)


@router.put("/{org_id}/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    org_id: str,
    dept_id: str,
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> DepartmentResponse:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    dept_uuid = _parse_uuid_or_422(dept_id, "department id")
    result = await db.execute(select(Department).where(Department.id == dept_uuid, Department.org_id == org_uuid))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    dept.name = payload.name.strip()
    dept.code = payload.code.strip() if payload.code else None
    dept.description = payload.description.strip() if payload.description else None
    dept.parent_dept_id = payload.parent_dept_id
    dept.color = payload.color.strip() if payload.color else None
    await db.flush()
    await db.refresh(dept)
    return DepartmentResponse.model_validate(dept)


@router.delete("/{org_id}/departments/{dept_id}", response_model=dict)
async def delete_department(
    org_id: str,
    dept_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    dept_uuid = _parse_uuid_or_422(dept_id, "department id")
    result = await db.execute(select(Department).where(Department.id == dept_uuid, Department.org_id == org_uuid))
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    await db.delete(dept)
    return {"deleted": True}


@router.post("/{org_id}/roles", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_role(
    org_id: str,
    payload: RoleProfileManage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    dept_id = payload.dept_id
    if dept_id:
        dept_result = await db.execute(select(Department.id).where(Department.id == dept_id, Department.org_id == org_uuid))
        if not dept_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid department id")
    role = RoleProfile(
        id=uuid.uuid4(),
        org_id=org_uuid,
        dept_id=dept_id,
        job_title=payload.title.strip(),
        seniority_level=payload.seniority_level.strip(),
        is_template=False,
    )
    db.add(role)
    await db.flush()
    return {"id": str(role.id), "title": role.job_title, "dept_id": str(role.dept_id) if role.dept_id else None}


@router.put("/{org_id}/roles/{role_id}", response_model=dict)
async def update_role(
    org_id: str,
    role_id: str,
    payload: RoleProfileManage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    role_uuid = _parse_uuid_or_422(role_id, "role id")
    result = await db.execute(
        select(RoleProfile).where(RoleProfile.id == role_uuid, RoleProfile.org_id == org_uuid, RoleProfile.is_template.is_(False))
    )
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    dept_id = payload.dept_id
    if dept_id:
        dept_result = await db.execute(select(Department.id).where(Department.id == dept_id, Department.org_id == org_uuid))
        if not dept_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid department id")
    role.job_title = payload.title.strip()
    role.seniority_level = payload.seniority_level.strip()
    role.dept_id = dept_id
    await db.flush()
    return {"id": str(role.id), "title": role.job_title, "dept_id": str(role.dept_id) if role.dept_id else None}


@router.delete("/{org_id}/roles/{role_id}", response_model=dict)
async def delete_role(
    org_id: str,
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    role_uuid = _parse_uuid_or_422(role_id, "role id")
    result = await db.execute(
        select(RoleProfile).where(RoleProfile.id == role_uuid, RoleProfile.org_id == org_uuid, RoleProfile.is_template.is_(False))
    )
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    await db.delete(role)
    return {"deleted": True}


@router.get("/{org_id}/projects", response_model=list[dict])
async def list_projects(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)

    project_query = select(Project).where(Project.org_id == org_uuid)
    # Employees can only see projects they are assigned to.
    if current_user.role == "employee":
        if not current_user.employee_id:
            return []
        project_query = (
            select(Project)
            .join(ProjectAssignment, ProjectAssignment.project_id == Project.id)
            .where(Project.org_id == org_uuid, ProjectAssignment.employee_id == current_user.employee_id)
        )

    project_result = await db.execute(project_query)
    projects = project_result.scalars().all()
    project_ids = [project.id for project in projects]
    if not project_ids:
        return []

    assignment_result = await db.execute(
        select(ProjectAssignment, Employee)
        .join(Employee, Employee.id == ProjectAssignment.employee_id)
        .where(ProjectAssignment.project_id.in_(project_ids))
    )
    assignments_by_project: dict[UUID, list[dict[str, str | None]]] = defaultdict(list)
    for assignment, employee in assignment_result.all():
        assignments_by_project[assignment.project_id].append(
            {
                "employee_id": str(employee.id),
                "employee_name": employee.full_name,
                "employee_email": employee.email,
                "position": assignment.position,
            }
        )

    return [_project_to_response(project, assignments_by_project.get(project.id, [])) for project in projects]


@router.get("/{org_id}/projects/{project_id}", response_model=dict)
async def get_project(
    org_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    project_uuid = _parse_uuid_or_422(project_id, "project id")

    project_result = await db.execute(select(Project).where(Project.id == project_uuid, Project.org_id == org_uuid))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    assignment_result = await db.execute(
        select(ProjectAssignment, Employee)
        .join(Employee, Employee.id == ProjectAssignment.employee_id)
        .where(ProjectAssignment.project_id == project_uuid)
    )
    assignments = [
        {
            "employee_id": str(employee.id),
            "employee_name": employee.full_name,
            "employee_email": employee.email,
            "position": assignment.position,
        }
        for assignment, employee in assignment_result.all()
    ]

    if current_user.role == "employee":
        is_assigned = any(a["employee_id"] == str(current_user.employee_id) for a in assignments)
        if not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return _project_to_response(project, assignments)


@router.post("/{org_id}/projects", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_project(
    org_id: str,
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    project = Project(
        id=uuid.uuid4(),
        org_id=org_uuid,
        name=payload.name.strip(),
        code=payload.code.strip() if payload.code else None,
        client_name=payload.client_name.strip() if payload.client_name else None,
        description=payload.description.strip() if payload.description else None,
        project_type=payload.project_type.strip() if payload.project_type else None,
        status=payload.status.strip() if payload.status else "planning",
        priority=payload.priority.strip() if payload.priority else None,
        start_date=payload.start_date,
        end_date=payload.end_date,
        budget=payload.budget,
        currency=payload.currency.strip() if payload.currency else None,
        delivery_model=payload.delivery_model.strip() if payload.delivery_model else None,
        tech_stack=payload.tech_stack.strip() if payload.tech_stack else None,
        jd_id=payload.jd_id,
        deadline=payload.deadline,
        delivery_notes=payload.delivery_notes,
    )
    db.add(project)
    await db.flush()
    return {"id": str(project.id), "name": project.name}


@router.put("/{org_id}/projects/{project_id}", response_model=dict)
async def update_project(
    org_id: str,
    project_id: str,
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    pid = _parse_uuid_or_422(project_id, "project id")
    result = await db.execute(select(Project).where(Project.id == pid, Project.org_id == org_uuid))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project.name = payload.name.strip()
    project.code = payload.code.strip() if payload.code else None
    project.client_name = payload.client_name.strip() if payload.client_name else None
    project.description = payload.description.strip() if payload.description else None
    project.project_type = payload.project_type.strip() if payload.project_type else None
    project.status = payload.status.strip() if payload.status else "planning"
    project.priority = payload.priority.strip() if payload.priority else None
    project.start_date = payload.start_date
    project.end_date = payload.end_date
    project.budget = payload.budget
    project.currency = payload.currency.strip() if payload.currency else None
    project.delivery_model = payload.delivery_model.strip() if payload.delivery_model else None
    project.tech_stack = payload.tech_stack.strip() if payload.tech_stack else None
    project.jd_id = payload.jd_id
    project.deadline = payload.deadline
    project.delivery_notes = payload.delivery_notes.strip() if payload.delivery_notes else None
    await db.flush()
    return {"updated": True, "id": str(project.id)}

@router.patch("/{org_id}/projects/{project_id}/status", response_model=dict)
async def update_project_status(
    org_id: str,
    project_id: str,
    status: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
):
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    pid = _parse_uuid_or_422(project_id, "project id")
    
    result = await db.execute(select(Project).where(Project.id == pid, Project.org_id == org_uuid))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project.status = status
    await db.commit()
    return {"success": True, "new_status": status}

@router.delete("/{org_id}/projects/{project_id}", response_model=dict)
async def delete_project(
    org_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
):
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    pid = _parse_uuid_or_422(project_id, "project id")
    
    await db.execute(delete(Project).where(Project.id == pid, Project.org_id == org_uuid))
    await db.commit()
    return {"success": True}


@router.post("/{org_id}/projects/{project_id}/assignments", response_model=dict)
async def assign_project_member(
    org_id: str,
    project_id: str,
    payload: ProjectAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    project_uuid = _parse_uuid_or_422(project_id, "project id")
    project_result = await db.execute(select(Project).where(Project.id == project_uuid, Project.org_id == org_uuid))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    employee_result = await db.execute(
        select(Employee).where(Employee.id == payload.employee_id, Employee.org_id == org_uuid)
    )
    employee = employee_result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    assignment_result = await db.execute(
        select(ProjectAssignment).where(
            ProjectAssignment.project_id == project_uuid, ProjectAssignment.employee_id == payload.employee_id
        )
    )
    assignment = assignment_result.scalar_one_or_none()
    if assignment:
        assignment.position = payload.position.strip()
    else:
        assignment = ProjectAssignment(
            id=uuid.uuid4(),
            project_id=project_uuid,
            employee_id=payload.employee_id,
            position=payload.position.strip(),
        )
        db.add(assignment)
    employee.project_status = "allocated"
    await db.flush()
    return {"assigned": True}


@router.delete("/{org_id}/projects/{project_id}/assignments/{employee_id}", response_model=dict)
async def remove_project_member(
    org_id: str,
    project_id: str,
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager")),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)
    project_uuid = _parse_uuid_or_422(project_id, "project id")
    employee_uuid = _parse_uuid_or_422(employee_id, "employee id")
    assignment_result = await db.execute(
        select(ProjectAssignment)
        .join(Project, Project.id == ProjectAssignment.project_id)
        .where(
            ProjectAssignment.project_id == project_uuid,
            ProjectAssignment.employee_id == employee_uuid,
            Project.org_id == org_uuid,
        )
    )
    assignment = assignment_result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    await db.delete(assignment)
    await db.flush()
    await _refresh_employee_project_status(db, employee_uuid)
    return {"deleted": True}


@router.get("/{org_id}/structure", response_model=dict)
async def get_org_structure(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    org_uuid = _parse_org_id(org_id)
    _ensure_org_access(org_uuid, current_user)

    dept_result = await db.execute(select(Department).where(Department.org_id == org_uuid))
    role_result = await db.execute(
        select(RoleProfile).where(RoleProfile.org_id == org_uuid, RoleProfile.is_template.is_(False))
    )
    emp_result = await db.execute(select(Employee).where(Employee.org_id == org_uuid))

    departments = dept_result.scalars().all()
    roles = role_result.scalars().all()
    employees = emp_result.scalars().all()

    role_map: dict[UUID | None, list[dict[str, str | None]]] = defaultdict(list)
    for role in roles:
        role_map[role.dept_id].append(
            {"id": str(role.id), "title": role.job_title, "seniority_level": role.seniority_level}
        )

    employee_map: dict[UUID | None, list[dict[str, str | None]]] = defaultdict(list)
    for employee in employees:
        employee_map[employee.dept_id].append(
            {
                "id": str(employee.id),
                "full_name": employee.full_name,
                "email": employee.email,
                "job_title": employee.job_title,
            }
        )

    dept_payload = []
    for department in departments:
        dept_payload.append(
            {
                "department": {"id": str(department.id), "name": department.name, "code": department.code},
                "roles": role_map.get(department.id, []),
                "employees": employee_map.get(department.id, []),
            }
        )

    unassigned_roles = role_map.get(None, [])
    unassigned_employees = employee_map.get(None, [])
    if unassigned_roles or unassigned_employees:
        dept_payload.append(
            {
                "department": {"id": "unassigned", "name": "Unassigned"},
                "roles": unassigned_roles,
                "employees": unassigned_employees,
            }
        )

    return {"departments": dept_payload}
