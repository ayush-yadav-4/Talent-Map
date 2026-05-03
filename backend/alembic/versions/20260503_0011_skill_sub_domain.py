"""Add sub_domain to skills for taxonomy grouping."""

from alembic import op
import sqlalchemy as sa

revision = "20260503_0011"
down_revision = "20260426_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "skills",
        sa.Column("sub_domain", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("skills", "sub_domain")
