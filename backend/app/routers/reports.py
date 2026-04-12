from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models.analytics import Assessment, AssessmentSession, EmployeeSkillScore, Skill, SkillGap
from app.models.department import Department
from app.models.employee import Employee
from app.models.user import User
from app.schemas.gap import DashboardStats

router = APIRouter()


@router.get("/hr/dashboard-stats", response_model=DashboardStats)
async def get_hr_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager", "manager")),
) -> DashboardStats:
    org_id = current_user.org_id

    total_emp = await db.scalar(select(func.count()).select_from(Employee).where(Employee.org_id == org_id, Employee.is_active.is_(True)))

    active_emp = await db.scalar(
        select(func.count())
        .select_from(Employee)
        .where(
            Employee.org_id == org_id,
            Employee.employment_status == "active",
            Employee.is_active.is_(True),
        )
    )

    assessed = await db.scalar(
        select(func.count(func.distinct(EmployeeSkillScore.employee_id)))
        .select_from(EmployeeSkillScore)
        .join(Employee, Employee.id == EmployeeSkillScore.employee_id)
        .where(Employee.org_id == org_id)
    )

    avg_prof = await db.scalar(
        select(func.avg(EmployeeSkillScore.proficiency_score))
        .select_from(EmployeeSkillScore)
        .join(Employee, Employee.id == EmployeeSkillScore.employee_id)
        .where(Employee.org_id == org_id)
    )

    critical_gaps = await db.scalar(
        select(func.count())
        .select_from(SkillGap)
        .join(Employee, Employee.id == SkillGap.employee_id)
        .where(
            Employee.org_id == org_id,
            SkillGap.status == "open",
            SkillGap.criticality == "essential",
        )
    )

    total_open_gaps = await db.scalar(
        select(func.count())
        .select_from(SkillGap)
        .join(Employee, Employee.id == SkillGap.employee_id)
        .where(Employee.org_id == org_id, SkillGap.status == "open")
    )

    high_risk_employees = await db.scalar(
        select(func.count(func.distinct(SkillGap.employee_id)))
        .select_from(SkillGap)
        .join(Employee, Employee.id == SkillGap.employee_id)
        .where(
            Employee.org_id == org_id,
            SkillGap.status == "open",
            SkillGap.priority_score >= 3.0,
        )
    )

    assessments_pending = await db.scalar(
        select(func.count())
        .select_from(AssessmentSession)
        .join(Employee, Employee.id == AssessmentSession.employee_id)
        .where(Employee.org_id == org_id, AssessmentSession.status == "not_started")
    )

    expired_certs = await db.scalar(
        select(func.count())
        .select_from(EmployeeSkillScore)
        .join(Employee, Employee.id == EmployeeSkillScore.employee_id)
        .where(Employee.org_id == org_id, EmployeeSkillScore.is_expired.is_(True))
    )

    today = date.today()
    d30 = today + timedelta(days=30)
    d60 = today + timedelta(days=60)
    d90 = today + timedelta(days=90)

    certs_30 = await db.scalar(
        select(func.count())
        .select_from(EmployeeSkillScore)
        .join(Employee, Employee.id == EmployeeSkillScore.employee_id)
        .where(
            Employee.org_id == org_id,
            EmployeeSkillScore.certification_expiry.isnot(None),
            EmployeeSkillScore.certification_expiry >= today,
            EmployeeSkillScore.certification_expiry <= d30,
            EmployeeSkillScore.is_expired.is_(False),
        )
    )
    certs_60 = await db.scalar(
        select(func.count())
        .select_from(EmployeeSkillScore)
        .join(Employee, Employee.id == EmployeeSkillScore.employee_id)
        .where(
            Employee.org_id == org_id,
            EmployeeSkillScore.certification_expiry.isnot(None),
            EmployeeSkillScore.certification_expiry >= today,
            EmployeeSkillScore.certification_expiry <= d60,
            EmployeeSkillScore.is_expired.is_(False),
        )
    )
    certs_90 = await db.scalar(
        select(func.count())
        .select_from(EmployeeSkillScore)
        .join(Employee, Employee.id == EmployeeSkillScore.employee_id)
        .where(
            Employee.org_id == org_id,
            EmployeeSkillScore.certification_expiry.isnot(None),
            EmployeeSkillScore.certification_expiry >= today,
            EmployeeSkillScore.certification_expiry <= d90,
            EmployeeSkillScore.is_expired.is_(False),
        )
    )

    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    assessments_month = await db.scalar(
        select(func.count())
        .select_from(AssessmentSession)
        .join(Employee, Employee.id == AssessmentSession.employee_id)
        .where(
            Employee.org_id == org_id,
            AssessmentSession.status == "completed",
            AssessmentSession.completed_at.isnot(None),
            AssessmentSession.completed_at >= month_start,
        )
    )

    top_gaps_result = await db.execute(
        select(
            Skill.canonical_name,
            Skill.domain,
            Skill.is_compliance,
            func.count().label("gap_count"),
            func.avg(SkillGap.gap_magnitude).label("avg_gap"),
        )
        .select_from(SkillGap)
        .join(Skill, Skill.id == SkillGap.skill_id)
        .join(Employee, Employee.id == SkillGap.employee_id)
        .where(Employee.org_id == org_id, SkillGap.status == "open")
        .group_by(Skill.canonical_name, Skill.domain, Skill.is_compliance)
        .order_by(func.count().desc())
        .limit(10)
    )
    te = int(total_emp or 0)
    top_skill_gaps: list[dict[str, Any]] = [
        {
            "skill_name": row.canonical_name,
            "skill": row.canonical_name,
            "domain": row.domain,
            "is_compliance": bool(row.is_compliance),
            "employees_affected": int(row.gap_count or 0),
            "count": int(row.gap_count or 0),
            "workforce_pct": round((int(row.gap_count or 0) / te) * 100, 1) if te else 0.0,
            "avg_gap": round(float(row.avg_gap or 0), 2),
            "criticality": "essential",
        }
        for row in top_gaps_result.all()
    ]

    dept_heatmap_result = await db.execute(
        select(
            Department.id,
            Department.name,
            func.count(func.distinct(Employee.id)).label("emp_count"),
            func.count(SkillGap.id).label("gap_count"),
            func.avg(EmployeeSkillScore.proficiency_score).label("avg_prof"),
        )
        .select_from(Department)
        .outerjoin(Employee, Employee.dept_id == Department.id)
        .outerjoin(SkillGap, and_(SkillGap.employee_id == Employee.id, SkillGap.status == "open"))
        .outerjoin(EmployeeSkillScore, EmployeeSkillScore.employee_id == Employee.id)
        .where(Department.org_id == org_id)
        .group_by(Department.id, Department.name)
    )
    dept_rows = list(dept_heatmap_result.all())
    max_gaps = max((int(r.gap_count or 0) for r in dept_rows), default=0)
    dept_summary = []
    for row in dept_rows:
        g = int(row.gap_count or 0)
        if g > 10:
            risk = "high"
        elif g >= 3:
            risk = "medium"
        else:
            risk = "low"
        dept_summary.append(
            {
                "dept_id": str(row.id),
                "dept": row.name,
                "name": row.name,
                "employee_count": int(row.emp_count or 0),
                "gaps": g,
                "total_gaps": g,
                "critical_gaps": g,
                "avg_proficiency": round(float(row.avg_prof or 0), 2),
                "risk_level": risk,
                "gap_bar_max": max_gaps,
            }
        )

    recent_rows = await db.execute(
        select(AssessmentSession, Assessment, Employee)
        .join(Assessment, Assessment.id == AssessmentSession.assessment_id)
        .join(Employee, Employee.id == AssessmentSession.employee_id)
        .where(Employee.org_id == org_id, AssessmentSession.status == "completed")
        .order_by(AssessmentSession.completed_at.desc().nulls_last())
        .limit(10)
    )
    recent_activity: list[dict[str, Any]] = []
    for sess, asmt, emp in recent_rows.all():
        score = sess.final_proficiency
        score_txt = f"{float(score):.1f}/5" if score is not None else "—"
        recent_activity.append(
            {
                "type": "assessment",
                "employee_id": str(emp.id),
                "employee_name": emp.full_name,
                "profile_photo_url": emp.profile_photo_url,
                "description": f"Completed {asmt.title} — Score {score_txt}",
                "timestamp": sess.completed_at.isoformat() if sess.completed_at else None,
            }
        )

    cert_alert_rows = await db.execute(
        select(Employee, EmployeeSkillScore, Skill)
        .join(EmployeeSkillScore, EmployeeSkillScore.employee_id == Employee.id)
        .join(Skill, Skill.id == EmployeeSkillScore.skill_id)
        .where(
            Employee.org_id == org_id,
            EmployeeSkillScore.certification_name.isnot(None),
        )
        .order_by(EmployeeSkillScore.certification_expiry.asc().nulls_last())
        .limit(20)
    )
    cert_alerts: list[dict[str, Any]] = []
    today_d = date.today()
    for emp, score, skill in cert_alert_rows.all():
        exp = score.certification_expiry
        days_left = (exp - today_d).days if exp else None
        if score.is_expired:
            urgency = "expired"
        elif days_left is not None and days_left <= 7:
            urgency = "critical"
        elif days_left is not None and days_left <= 30:
            urgency = "high"
        elif days_left is not None and days_left <= 60:
            urgency = "medium"
        else:
            urgency = "low"
        cert_alerts.append(
            {
                "employee_id": str(emp.id),
                "employee_name": emp.full_name,
                "email": emp.email,
                "profile_photo_url": emp.profile_photo_url,
                "cert_name": score.certification_name,
                "skill_name": skill.canonical_name,
                "expiry_date": exp.isoformat() if exp else None,
                "days_until_expiry": days_left,
                "is_expired": bool(score.is_expired),
                "urgency": urgency,
            }
        )

    coverage = round((int(assessed or 0) / te) * 100, 1) if te else 0.0

    return DashboardStats(
        total_employees=te,
        active_employees=int(active_emp or 0),
        employees_assessed=int(assessed or 0),
        avg_org_proficiency=round(float(avg_prof or 0.0), 2),
        total_critical_gaps=int(critical_gaps or 0),
        total_open_gaps=int(total_open_gaps or 0),
        high_risk_employees=int(high_risk_employees or 0),
        certs_expiring_30_days=int(certs_30 or 0),
        certs_expiring_60_days=int(certs_60 or 0),
        certs_expiring_90_days=int(certs_90 or 0),
        expired_certifications=int(expired_certs or 0),
        assessments_completed_this_month=int(assessments_month or 0),
        assessments_pending=int(assessments_pending or 0),
        top_skill_gaps=top_skill_gaps,
        dept_gap_heatmap=dept_summary,
        recent_activity=recent_activity,
        certification_alerts=cert_alerts,
    )


@router.get("/hr/dashboard")
async def get_hr_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("org_admin", "hr_manager", "manager")),
) -> dict[str, Any]:
    """Aggregated HR dashboard payload (single call)."""
    flat = await get_hr_dashboard_stats(db, current_user)
    d = flat.model_dump()
    te = d["total_employees"] or 1
    coverage = round((d["employees_assessed"] / te) * 100, 1) if te else 0.0
    return {
        "counts": {
            "total_employees": d["total_employees"],
            "active_employees": d["active_employees"],
            "employees_assessed": d["employees_assessed"],
            "assessment_coverage_pct": coverage,
            "total_open_gaps": d["total_open_gaps"],
            "critical_gaps": d["total_critical_gaps"],
            "high_risk_employees": d["high_risk_employees"],
            "certifications_expiring_30": d["certs_expiring_30_days"],
            "certifications_expiring_60": d["certs_expiring_60_days"],
            "certifications_expiring_90": d["certs_expiring_90_days"],
            "expired_certifications": d["expired_certifications"],
            "assessments_this_month": d["assessments_completed_this_month"],
            "assessments_pending": d["assessments_pending"],
        },
        "proficiency": {"avg_org_proficiency": d["avg_org_proficiency"]},
        "gaps": {"top_skill_gaps": d["top_skill_gaps"]},
        "certifications": {"alerts": d.get("certification_alerts", [])},
        "assessments": {
            "completed_this_month": d["assessments_completed_this_month"],
            "pending": d["assessments_pending"],
        },
        "heatmap": d["dept_gap_heatmap"],
        "recent_activity": d["recent_activity"][:10],
    }


@router.get("/employee/dashboard-stats/{employee_id}")
async def get_employee_dashboard_stats(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        eid = UUID(employee_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid employee id") from exc

    if current_user.employee_id != eid and current_user.role not in ("org_admin", "hr_manager", "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    emp_row = await db.execute(select(Employee).where(Employee.id == eid))
    emp = emp_row.scalar_one_or_none()
    if not emp or emp.org_id != current_user.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    scores_result = await db.execute(
        select(EmployeeSkillScore, Skill)
        .join(Skill, EmployeeSkillScore.skill_id == Skill.id)
        .where(EmployeeSkillScore.employee_id == eid)
        .order_by(EmployeeSkillScore.proficiency_score.desc())
    )
    scores_data = scores_result.all()

    gaps_result = await db.execute(
        select(SkillGap, Skill)
        .join(Skill, SkillGap.skill_id == Skill.id)
        .where(and_(SkillGap.employee_id == eid, SkillGap.status == "open"))
        .order_by(SkillGap.priority_score.desc())
        .limit(5)
    )

    sessions_result = await db.execute(
        select(AssessmentSession)
        .where(AssessmentSession.employee_id == eid)
        .order_by(AssessmentSession.completed_at.desc())
        .limit(5)
    )

    skills_by_domain: dict[str, dict[str, Any]] = {}
    for score, skill in scores_data:
        domain = skill.domain or "other"
        bucket = skills_by_domain.setdefault(domain, {"domain": domain, "count": 0, "scores": []})
        bucket["scores"].append(float(score.proficiency_score or 0))
        bucket["count"] += 1
    for d in skills_by_domain.values():
        scores_list = d.pop("scores", [])
        d["avg"] = round(sum(scores_list) / len(scores_list), 2) if scores_list else 0.0

    top_gaps = [
        {
            "skill": skill.canonical_name,
            "domain": skill.domain,
            "gap": float(gap.gap_magnitude),
            "priority": float(gap.priority_score or 0),
            "criticality": gap.criticality,
        }
        for gap, skill in gaps_result.all()
    ]

    recent_sessions = [
        {
            "id": str(s.id),
            "status": s.status,
            "proficiency": s.final_proficiency,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        for s in sessions_result.scalars().all()
    ]

    all_scores = [float(s.proficiency_score) for s, _ in scores_data if s.proficiency_score is not None]
    return {
        "total_skills_profiled": len(scores_data),
        "avg_proficiency": round(sum(all_scores) / len(all_scores), 2) if all_scores else 0.0,
        "skills_by_domain": list(skills_by_domain.values()),
        "top_gaps": top_gaps,
        "total_gaps": len(top_gaps),
        "recent_sessions": recent_sessions,
        "certs_expiring_soon": sum(1 for s, _ in scores_data if s.certification_expiry and not s.is_expired),
    }
