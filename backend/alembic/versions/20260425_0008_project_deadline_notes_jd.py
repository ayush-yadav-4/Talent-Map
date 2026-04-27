"""Add missing project fields: deadline, delivery_notes, jd_id."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260425_0008"
down_revision: str | None = "20260425_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("deadline", sa.Date(), nullable=True))
    op.add_column("projects", sa.Column("delivery_notes", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("jd_id", postgresql.UUID(as_uuid=True), nullable=True))
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("job_descriptions"):
        op.create_foreign_key(
            "fk_projects_jd_id_job_descriptions",
            "projects",
            "job_descriptions",
            ["jd_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    fks = {fk.get("name") for fk in inspector.get_foreign_keys("projects")}
    if "fk_projects_jd_id_job_descriptions" in fks:
        op.drop_constraint("fk_projects_jd_id_job_descriptions", "projects", type_="foreignkey")
    op.drop_column("projects", "jd_id")
    op.drop_column("projects", "delivery_notes")
    op.drop_column("projects", "deadline")
