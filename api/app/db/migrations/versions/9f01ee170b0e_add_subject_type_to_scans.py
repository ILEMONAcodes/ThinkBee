"""Add an optional crop or hive type to scans."""

import sqlalchemy as sa
from alembic import op

revision = "9f01ee170b0e"
down_revision = "581f4544c316"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scans", sa.Column("subject_type", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("scans", "subject_type")
