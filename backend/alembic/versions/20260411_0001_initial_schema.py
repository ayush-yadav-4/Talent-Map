"""Initial schema for Skill Gap Engine (Supabase / PostgreSQL + pgvector).

Revision ID: 20260411_0001
Revises:
Create Date: 2026-04-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import ARRAY, INET, JSONB, UUID

revision: str = "20260411_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))

    op.create_table(
        "organizations",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("sector", sa.String(length=50), nullable=False),
        sa.Column("sub_sector", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=10), server_default="IN", nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("domain", sa.String(length=255), nullable=True),
        sa.Column("subscription_plan", sa.String(length=50), server_default="trial", nullable=True),
        sa.Column("max_employees", sa.Integer(), server_default="100", nullable=True),
        sa.Column("settings", JSONB(), server_default="{}", nullable=True),
        sa.Column("data_residency", sa.String(length=50), server_default="cloud", nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "departments",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("org_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("parent_dept_id", UUID(as_uuid=True), nullable=True),
        sa.Column("head_employee_id", UUID(as_uuid=True), nullable=True),
        sa.Column("code", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_dept_id"], ["departments.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "employees",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("org_id", UUID(as_uuid=True), nullable=False),
        sa.Column("dept_id", UUID(as_uuid=True), nullable=True),
        sa.Column("employee_code", sa.String(length=100), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("job_title", sa.String(length=255), nullable=True),
        sa.Column("esco_occupation_uri", sa.Text(), nullable=True),
        sa.Column("seniority_level", sa.String(length=50), nullable=True),
        sa.Column("employment_type", sa.String(length=50), server_default="full_time", nullable=True),
        sa.Column("grade_band", sa.String(length=50), nullable=True),
        sa.Column("cadre", sa.String(length=100), nullable=True),
        sa.Column("service_type", sa.String(length=100), nullable=True),
        sa.Column("posting_location", sa.String(length=255), nullable=True),
        sa.Column("clinical_specialization", sa.String(length=255), nullable=True),
        sa.Column("registration_number", sa.String(length=100), nullable=True),
        sa.Column("manager_id", UUID(as_uuid=True), nullable=True),
        sa.Column("github_handle", sa.String(length=100), nullable=True),
        sa.Column("jira_username", sa.String(length=100), nullable=True),
        sa.Column("teams_user_id", sa.String(length=255), nullable=True),
        sa.Column("slack_user_id", sa.String(length=100), nullable=True),
        sa.Column("hris_employee_id", sa.String(length=100), nullable=True),
        sa.Column("gov_employee_id", sa.String(length=100), nullable=True),
        sa.Column("hospital_staff_id", sa.String(length=100), nullable=True),
        sa.Column("profile_photo_url", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("date_of_joining", sa.Date(), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("years_of_experience", sa.Float(), nullable=True),
        sa.Column("location_city", sa.String(length=100), nullable=True),
        sa.Column("consent_github", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("consent_email", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("consent_teams", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("consent_slack", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("consent_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("employment_status", sa.String(length=20), server_default="active", nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["dept_id"], ["departments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["manager_id"], ["employees.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_foreign_key(
        "fk_dept_head_employee",
        "departments",
        "employees",
        ["head_employee_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "skills",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("esco_uri", sa.Text(), nullable=True),
        sa.Column("canonical_name", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("skill_type", sa.String(length=50), nullable=True),
        sa.Column("domain", sa.String(length=100), nullable=True),
        sa.Column("sector_tags", ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("parent_skill_id", UUID(as_uuid=True), nullable=True),
        sa.Column("synonyms", ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("embedding", Vector(384), nullable=True),
        sa.Column("bloom_level", sa.String(length=50), nullable=True),
        sa.Column("is_emerging", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("is_compliance", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("source", sa.String(length=50), server_default="esco", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["parent_skill_id"], ["skills.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("esco_uri"),
    )
    op.create_index("idx_skills_canonical", "skills", ["canonical_name"], unique=False)
    op.create_index("idx_skills_domain", "skills", ["domain"], unique=False)
    op.create_index("idx_skills_sector_tags", "skills", ["sector_tags"], unique=False, postgresql_using="gin")

    op.create_table(
        "skill_synonyms",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("skill_id", UUID(as_uuid=True), nullable=False),
        sa.Column("synonym", sa.String(length=500), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("skill_id", "synonym"),
    )

    op.create_table(
        "role_profiles",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("org_id", UUID(as_uuid=True), nullable=True),
        sa.Column("job_title", sa.String(length=255), nullable=False),
        sa.Column("esco_occupation_uri", sa.Text(), nullable=True),
        sa.Column("sector", sa.String(length=50), nullable=True),
        sa.Column("seniority_level", sa.String(length=50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_template", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("calibrated_from_top_performers", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("org_id", "job_title", "seniority_level"),
    )

    op.create_table(
        "role_required_skills",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("role_profile_id", UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", UUID(as_uuid=True), nullable=False),
        sa.Column("min_proficiency", sa.Float(), server_default="3.0", nullable=False),
        sa.Column("criticality", sa.String(length=20), server_default="important", nullable=True),
        sa.Column("criticality_weight", sa.Float(), server_default="1.0", nullable=True),
        sa.Column("is_compliance", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("expiry_tracking", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["role_profile_id"], ["role_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("role_profile_id", "skill_id"),
    )

    op.create_table(
        "employee_skill_scores",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", UUID(as_uuid=True), nullable=False),
        sa.Column("theta_score", sa.Float(), nullable=True),
        sa.Column("proficiency_score", sa.Float(), nullable=True),
        sa.Column("proficiency_level", sa.String(length=20), nullable=True),
        sa.Column("confidence", sa.Float(), server_default="0.0", nullable=True),
        sa.Column("evidence_count", sa.Integer(), server_default="0", nullable=True),
        sa.Column("source_diversity", sa.Integer(), server_default="0", nullable=True),
        sa.Column("self_rating", sa.Float(), nullable=True),
        sa.Column("self_rating_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("self_rating_note", sa.Text(), nullable=True),
        sa.Column("manager_rating", sa.Float(), nullable=True),
        sa.Column("manager_rating_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score_validated", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("certification_name", sa.String(length=500), nullable=True),
        sa.Column("certification_expiry", sa.Date(), nullable=True),
        sa.Column("is_expired", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("first_evidence_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_evidence_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_computed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("employee_id", "skill_id"),
    )
    op.create_index("idx_emp_skill_scores_employee", "employee_skill_scores", ["employee_id"], unique=False)
    op.create_index("idx_emp_skill_scores_skill", "employee_skill_scores", ["skill_id"], unique=False)

    op.create_table(
        "skill_evidence",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", UUID(as_uuid=True), nullable=False),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("source_system", sa.String(length=100), nullable=True),
        sa.Column("source_record_id", sa.String(length=500), nullable=True),
        sa.Column("evidence_snippet", sa.Text(), nullable=True),
        sa.Column("evidence_url", sa.Text(), nullable=True),
        sa.Column("proficiency_raw", sa.Float(), nullable=False),
        sa.Column("sentiment", sa.String(length=20), nullable=True),
        sa.Column("confidence_weight", sa.Float(), nullable=False),
        sa.Column("decay_half_life_days", sa.Integer(), server_default="365", nullable=True),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("extracted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("extraction_method", sa.String(length=50), nullable=True),
        sa.Column("llm_model_used", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=True),
        sa.Column("is_flagged", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_evidence_employee", "skill_evidence", ["employee_id"], unique=False)
    op.create_index("idx_evidence_skill", "skill_evidence", ["skill_id"], unique=False)
    op.create_index("idx_evidence_source", "skill_evidence", ["source_type"], unique=False)
    op.create_index("idx_evidence_observed", "skill_evidence", ["observed_at"], unique=False)

    op.create_table(
        "skill_gaps",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), nullable=False),
        sa.Column("role_profile_id", UUID(as_uuid=True), nullable=False),
        sa.Column("skill_id", UUID(as_uuid=True), nullable=False),
        sa.Column("required_proficiency", sa.Float(), nullable=False),
        sa.Column("current_proficiency", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("gap_magnitude", sa.Float(), nullable=False),
        sa.Column("criticality", sa.String(length=20), nullable=True),
        sa.Column("priority_score", sa.Float(), nullable=True),
        sa.Column("urgency_factor", sa.Float(), server_default="1.0", nullable=True),
        sa.Column("status", sa.String(length=30), server_default="open", nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recommended_actions", JSONB(), server_default="[]", nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_profile_id"], ["role_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("employee_id", "role_profile_id", "skill_id"),
    )
    op.create_index("idx_gaps_employee", "skill_gaps", ["employee_id"], unique=False)
    op.create_index("idx_gaps_priority", "skill_gaps", ["priority_score"], unique=False, postgresql_where=sa.text("status = 'open'"))

    op.create_table(
        "question_bank",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("skill_id", UUID(as_uuid=True), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(length=30), server_default="mcq", nullable=True),
        sa.Column("bloom_level", sa.String(length=20), nullable=False),
        sa.Column("difficulty_target", sa.String(length=10), nullable=False),
        sa.Column("audience_type", ARRAY(sa.Text()), server_default="{}", nullable=True),
        sa.Column("options", JSONB(), nullable=True),
        sa.Column("correct_answer_id", sa.String(length=10), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("irt_b", sa.Float(), nullable=True),
        sa.Column("irt_a", sa.Float(), nullable=True),
        sa.Column("irt_c", sa.Float(), server_default="0.25", nullable=True),
        sa.Column("calibration_status", sa.String(length=20), server_default="draft", nullable=True),
        sa.Column("pilot_response_count", sa.Integer(), server_default="0", nullable=True),
        sa.Column("real_b_estimate", sa.Float(), nullable=True),
        sa.Column("real_a_estimate", sa.Float(), nullable=True),
        sa.Column("sme_approved", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("adverse_impact_checked", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("exposure_count", sa.Integer(), server_default="0", nullable=True),
        sa.Column("exposure_rate", sa.Float(), server_default="0.0", nullable=True),
        sa.Column("language", sa.String(length=10), server_default="en", nullable=True),
        sa.Column("version", sa.Integer(), server_default="1", nullable=True),
        sa.Column("parent_question_id", UUID(as_uuid=True), nullable=True),
        sa.Column("generated_by", sa.String(length=50), nullable=True),
        sa.Column("llm_model", sa.String(length=100), nullable=True),
        sa.Column("expires_at", sa.Date(), nullable=True),
        sa.Column("technology_version_lock", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["parent_question_id"], ["question_bank.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["skill_id"], ["skills.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_qbank_skill", "question_bank", ["skill_id"], unique=False)
    op.create_index("idx_qbank_status", "question_bank", ["calibration_status"], unique=False)
    op.create_index("idx_qbank_type", "question_bank", ["question_type"], unique=False)
    op.create_index("idx_qbank_audience", "question_bank", ["audience_type"], unique=False, postgresql_using="gin")

    op.create_table(
        "assessments",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("org_id", UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("assessment_type", sa.String(length=50), nullable=True),
        sa.Column(
            "skill_ids",
            ARRAY(UUID(as_uuid=True)),
            server_default=sa.text("'{}'::uuid[]"),
            nullable=True,
        ),
        sa.Column("role_profile_id", UUID(as_uuid=True), nullable=True),
        sa.Column("max_questions", sa.Integer(), server_default="20", nullable=True),
        sa.Column("time_limit_minutes", sa.Integer(), nullable=True),
        sa.Column("is_adaptive", sa.Boolean(), server_default="true", nullable=True),
        sa.Column("is_proctored", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("audience_type", sa.String(length=50), server_default="all", nullable=True),
        sa.Column("is_mandatory", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["employees.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_profile_id"], ["role_profiles.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "assessment_sessions",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("assessment_id", UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), nullable=False),
        sa.Column("current_theta", sa.Float(), server_default="0.0", nullable=True),
        sa.Column("current_se", sa.Float(), server_default="1.0", nullable=True),
        sa.Column("questions_served", sa.Integer(), server_default="0", nullable=True),
        sa.Column("status", sa.String(length=20), server_default="not_started", nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("time_taken_seconds", sa.Integer(), nullable=True),
        sa.Column("final_theta", sa.Float(), nullable=True),
        sa.Column("final_proficiency", sa.Float(), nullable=True),
        sa.Column("final_se", sa.Float(), nullable=True),
        sa.Column("raw_score", sa.Float(), nullable=True),
        sa.Column("percentage_score", sa.Float(), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.Column("pass_threshold", sa.Float(), server_default="3.0", nullable=True),
        sa.Column("response_pattern_flag", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("avg_response_time_seconds", sa.Float(), nullable=True),
        sa.Column("flagged_for_review", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_sessions_employee", "assessment_sessions", ["employee_id"], unique=False)
    op.create_index("idx_sessions_assessment", "assessment_sessions", ["assessment_id"], unique=False)
    op.create_index("idx_sessions_status", "assessment_sessions", ["status"], unique=False)

    op.create_table(
        "assessment_responses",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("session_id", UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", UUID(as_uuid=True), nullable=False),
        sa.Column("selected_option_id", sa.String(length=10), nullable=True),
        sa.Column("open_text_response", sa.Text(), nullable=True),
        sa.Column("response_time_seconds", sa.Integer(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("theta_before", sa.Float(), nullable=True),
        sa.Column("theta_after", sa.Float(), nullable=True),
        sa.Column("llm_score", sa.Float(), nullable=True),
        sa.Column("llm_score_rationale", sa.Text(), nullable=True),
        sa.Column("llm_scored_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("question_sequence", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["question_id"], ["question_bank.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["assessment_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_responses_session", "assessment_responses", ["session_id"], unique=False)

    op.create_table(
        "integration_configs",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("org_id", UUID(as_uuid=True), nullable=False),
        sa.Column("integration_type", sa.String(length=50), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("config", JSONB(), server_default="{}", nullable=True),
        sa.Column("account_token", sa.Text(), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_status", sa.String(length=20), nullable=True),
        sa.Column("next_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sync_frequency", sa.String(length=20), server_default="daily", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("org_id", "integration_type"),
    )

    op.create_table(
        "sync_logs",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("org_id", UUID(as_uuid=True), nullable=False),
        sa.Column("integration_type", sa.String(length=50), nullable=False),
        sa.Column("sync_type", sa.String(length=30), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("records_pulled", sa.Integer(), server_default="0", nullable=True),
        sa.Column("records_processed", sa.Integer(), server_default="0", nullable=True),
        sa.Column("errors", JSONB(), server_default="[]", nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), nullable=True),
        sa.Column("org_id", UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.Text(), nullable=True),
        sa.Column("role", sa.String(length=30), server_default="employee", nullable=False),
        sa.Column("is_sso", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("sso_provider", sa.String(length=50), nullable=True),
        sa.Column("sso_subject", sa.String(length=500), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("org_id", UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", UUID(as_uuid=True), nullable=True),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=20), server_default="normal", nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("action_url", sa.Text(), nullable=True),
        sa.Column("metadata", JSONB(), server_default="{}", nullable=True),
        sa.Column("sent_email", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_notif_employee", "notifications", ["employee_id", "is_read"], unique=False)
    op.create_index("idx_notif_org", "notifications", ["org_id", "created_at"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("org_id", UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("employee_id", UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("resource_type", sa.String(length=50), nullable=True),
        sa.Column("resource_id", UUID(as_uuid=True), nullable=True),
        sa.Column("ip_address", INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("metadata", JSONB(), server_default="{}", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_audit_org", "audit_logs", ["org_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_audit_org", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index("idx_notif_org", table_name="notifications")
    op.drop_index("idx_notif_employee", table_name="notifications")
    op.drop_table("notifications")
    op.drop_table("users")
    op.drop_table("sync_logs")
    op.drop_table("integration_configs")
    op.drop_index("idx_responses_session", table_name="assessment_responses")
    op.drop_table("assessment_responses")
    op.drop_index("idx_sessions_status", table_name="assessment_sessions")
    op.drop_index("idx_sessions_assessment", table_name="assessment_sessions")
    op.drop_index("idx_sessions_employee", table_name="assessment_sessions")
    op.drop_table("assessment_sessions")
    op.drop_table("assessments")
    op.drop_index("idx_qbank_audience", table_name="question_bank")
    op.drop_index("idx_qbank_type", table_name="question_bank")
    op.drop_index("idx_qbank_status", table_name="question_bank")
    op.drop_index("idx_qbank_skill", table_name="question_bank")
    op.drop_table("question_bank")
    op.drop_index("idx_gaps_priority", table_name="skill_gaps")
    op.drop_index("idx_gaps_employee", table_name="skill_gaps")
    op.drop_table("skill_gaps")
    op.drop_index("idx_evidence_observed", table_name="skill_evidence")
    op.drop_index("idx_evidence_source", table_name="skill_evidence")
    op.drop_index("idx_evidence_skill", table_name="skill_evidence")
    op.drop_index("idx_evidence_employee", table_name="skill_evidence")
    op.drop_table("skill_evidence")
    op.drop_index("idx_emp_skill_scores_skill", table_name="employee_skill_scores")
    op.drop_index("idx_emp_skill_scores_employee", table_name="employee_skill_scores")
    op.drop_table("employee_skill_scores")
    op.drop_table("role_required_skills")
    op.drop_table("role_profiles")
    op.drop_table("skill_synonyms")
    op.drop_index("idx_skills_sector_tags", table_name="skills")
    op.drop_index("idx_skills_domain", table_name="skills")
    op.drop_index("idx_skills_canonical", table_name="skills")
    op.drop_table("skills")
    op.drop_constraint("fk_dept_head_employee", "departments", type_="foreignkey")
    op.drop_table("employees")
    op.drop_table("departments")
    op.drop_table("organizations")
    op.execute(sa.text("DROP EXTENSION IF EXISTS vector"))
