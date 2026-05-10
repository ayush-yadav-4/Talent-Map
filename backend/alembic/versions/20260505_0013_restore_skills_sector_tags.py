"""Restore skills.sector_tags column for taxonomy filters.

Revision ID: 20260505_0013
Revises: 20260503_0012
Create Date: 2026-05-05
"""

from alembic import op
import sqlalchemy as sa

revision = "20260505_0013"
down_revision = "20260503_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Safe for mixed environments where the column may already exist.
    op.execute(
        sa.text(
            """
            ALTER TABLE skills
            ADD COLUMN IF NOT EXISTS sector_tags TEXT[] DEFAULT '{}'::text[]
            """
        )
    )

    op.execute(
        sa.text(
            """
            CREATE INDEX IF NOT EXISTS idx_skills_sector_tags
            ON skills USING GIN (sector_tags)
            """
        )
    )


def downgrade() -> None:
    # Keep downgrade conservative; remove only what this migration introduced.
    op.execute(sa.text("DROP INDEX IF EXISTS idx_skills_sector_tags"))
    op.execute(sa.text("ALTER TABLE skills DROP COLUMN IF EXISTS sector_tags"))
