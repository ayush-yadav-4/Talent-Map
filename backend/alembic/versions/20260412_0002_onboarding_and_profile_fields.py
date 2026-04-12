"""Add onboarding, contact, education, resume, and department description fields."""

from alembic import op
import sqlalchemy as sa


revision = "20260412_0002"
down_revision: str | None = "20260411_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("onboarding_completed", sa.Boolean(), server_default="false", nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("onboarding_step", sa.Integer(), server_default="1", nullable=True),
    )
    op.add_column("organizations", sa.Column("contact_name", sa.String(length=255), nullable=True))
    op.add_column("organizations", sa.Column("contact_phone", sa.String(length=20), nullable=True))
    op.add_column("organizations", sa.Column("contact_designation", sa.String(length=255), nullable=True))
    op.add_column("organizations", sa.Column("employee_count_range", sa.String(length=50), nullable=True))
    op.add_column("organizations", sa.Column("primary_use_case", sa.String(length=100), nullable=True))

    op.add_column("users", sa.Column("full_name", sa.String(length=255), nullable=True))
    op.add_column(
        "users",
        sa.Column("onboarding_completed", sa.Boolean(), server_default="false", nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("onboarding_step", sa.Integer(), server_default="1", nullable=True),
    )

    op.add_column("departments", sa.Column("description", sa.Text(), nullable=True))

    op.add_column("employees", sa.Column("highest_qualification", sa.String(length=100), nullable=True))
    op.add_column("employees", sa.Column("field_of_study", sa.String(length=255), nullable=True))
    op.add_column("employees", sa.Column("institution", sa.String(length=255), nullable=True))
    op.add_column("employees", sa.Column("graduation_year", sa.String(length=10), nullable=True))
    op.add_column("employees", sa.Column("location_state", sa.String(length=100), nullable=True))
    op.add_column("employees", sa.Column("resume_url", sa.Text(), nullable=True))
    op.add_column("employees", sa.Column("resume_parsed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("employees", "resume_parsed_at")
    op.drop_column("employees", "resume_url")
    op.drop_column("employees", "location_state")
    op.drop_column("employees", "graduation_year")
    op.drop_column("employees", "institution")
    op.drop_column("employees", "field_of_study")
    op.drop_column("employees", "highest_qualification")

    op.drop_column("departments", "description")

    op.drop_column("users", "onboarding_step")
    op.drop_column("users", "onboarding_completed")
    op.drop_column("users", "full_name")

    op.drop_column("organizations", "primary_use_case")
    op.drop_column("organizations", "employee_count_range")
    op.drop_column("organizations", "contact_designation")
    op.drop_column("organizations", "contact_phone")
    op.drop_column("organizations", "contact_name")
    op.drop_column("organizations", "onboarding_step")
    op.drop_column("organizations", "onboarding_completed")
