"""Create psychometric_results table."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260503_0012"
down_revision = "20260503_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "psychometric_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assessment_type", sa.String(length=30), nullable=False),
        sa.Column("raw_scores", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("dominant_trait", sa.String(length=120), nullable=False),
        sa.Column("learning_style", sa.String(length=80), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_psychometric_results_org", "psychometric_results", ["org_id"])
    op.create_index("ix_psychometric_results_employee", "psychometric_results", ["employee_id"])


def downgrade() -> None:
    op.drop_index("ix_psychometric_results_employee", table_name="psychometric_results")
    op.drop_index("ix_psychometric_results_org", table_name="psychometric_results")
    op.drop_table("psychometric_results")
