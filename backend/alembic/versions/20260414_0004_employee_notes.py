"""Add employee notes column for HR invite metadata."""

from alembic import op
import sqlalchemy as sa


revision = "20260414_0004"
down_revision: str | None = "20260413_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("employees", "notes")
