"""Add employees.last_ai_sync_at for AI sync tracking."""

from alembic import op
import sqlalchemy as sa


revision = "20260425_0007"
down_revision: str | None = "d722c8739a78"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("last_ai_sync_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("employees", "last_ai_sync_at")
