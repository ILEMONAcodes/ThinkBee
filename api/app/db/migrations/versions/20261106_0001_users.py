"""Create local Supabase account mappings and farmer identifiers."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261106_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("supabase_user_id", sa.Uuid(), nullable=False),
        sa.Column("farmer_id", sa.String(11), nullable=False),
        sa.Column("status", sa.String(16), server_default="active", nullable=False),
        sa.Column(
            "is_think_bee_admin", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("locale", sa.String(16), server_default="en-NG", nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("supabase_user_id", name=op.f("uq_users_supabase_user_id")),
        sa.UniqueConstraint("farmer_id", name=op.f("uq_users_farmer_id")),
        sa.CheckConstraint(
            "status IN ('active', 'suspended', 'deleted')", name=op.f("ck_users_status")
        ),
        sa.CheckConstraint(
            "farmer_id ~ '^TB-[0-9A-HJKMNP-TV-Z]{8}$'", name=op.f("ck_users_farmer_id_format")
        ),
    )


def downgrade() -> None:
    op.drop_table("users")
