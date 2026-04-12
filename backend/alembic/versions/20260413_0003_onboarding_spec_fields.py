"""Department color, role dept link, employee invite/onboard fields, widen primary_use_case."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "20260413_0003"
down_revision: str | None = "20260412_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("departments", sa.Column("color", sa.String(length=20), nullable=True))
    op.add_column("employees", sa.Column("gender", sa.String(length=30), nullable=True))
    op.add_column("employees", sa.Column("invited_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("employees", sa.Column("onboarded_at", sa.DateTime(timezone=True), nullable=True))

    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            "SELECT c.conname FROM pg_constraint c "
            "JOIN pg_class t ON c.conrelid = t.oid "
            "WHERE t.relname = 'role_profiles' AND c.contype = 'u'"
        )
    ).fetchall()
    for (conname,) in rows:
        op.drop_constraint(conname, "role_profiles", type_="unique")

    op.add_column(
        "role_profiles",
        sa.Column("dept_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_role_profiles_dept_id_departments",
        "role_profiles",
        "departments",
        ["dept_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.alter_column(
        "organizations",
        "primary_use_case",
        existing_type=sa.String(length=100),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "organizations",
        "primary_use_case",
        existing_type=sa.Text(),
        type_=sa.String(length=100),
        existing_nullable=True,
    )

    op.drop_constraint("fk_role_profiles_dept_id_departments", "role_profiles", type_="foreignkey")
    op.drop_column("role_profiles", "dept_id")
    op.create_unique_constraint(
        "role_profiles_org_id_job_title_seniority_level_key",
        "role_profiles",
        ["org_id", "job_title", "seniority_level"],
    )

    op.drop_column("employees", "onboarded_at")
    op.drop_column("employees", "invited_at")
    op.drop_column("employees", "gender")
    op.drop_column("departments", "color")
