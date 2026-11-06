"""Add private farms, units, profiles and durable account deletion work."""

from collections.abc import Sequence
from datetime import datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261106_0002"
down_revision: str | None = "20261106_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamps() -> list[sa.Column[datetime]]:
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "chat_profiles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.String(80), nullable=False),
        sa.Column("photo_key", sa.String(512), nullable=True),
        sa.Column("bio", sa.String(280), server_default="", nullable=False),
        sa.Column("area_state", sa.String(80), nullable=True),
        sa.Column("area_lga", sa.String(100), nullable=True),
        sa.Column("show_crops", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("show_hive_type", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        *timestamps(),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_chat_profiles")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_chat_profiles_user_id_users"),
            ondelete="CASCADE",
        ),
    )
    op.create_table(
        "farms",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("state", sa.String(80), nullable=True),
        sa.Column("lga", sa.String(100), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        *timestamps(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_farms")),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_farms_user_id_users"), ondelete="CASCADE"
        ),
        sa.UniqueConstraint("user_id", "client_id", name=op.f("uq_farms_user_id")),
        sa.CheckConstraint("kind IN ('crops', 'bees', 'both')", name=op.f("ck_farms_kind")),
        sa.CheckConstraint(
            "(lat IS NULL AND lng IS NULL) OR (lat IS NOT NULL AND lng IS NOT NULL "
            "AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)",
            name=op.f("ck_farms_coordinates"),
        ),
    )
    op.create_index("ix_farms_user_id", "farms", ["user_id"])
    op.create_table(
        "farm_units",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("details", postgresql.JSONB(), nullable=False),
        *timestamps(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_farm_units")),
        sa.ForeignKeyConstraint(
            ["farm_id"], ["farms.id"], name=op.f("fk_farm_units_farm_id_farms"), ondelete="CASCADE"
        ),
        sa.UniqueConstraint("farm_id", "client_id", name=op.f("uq_farm_units_farm_id")),
        sa.CheckConstraint("kind IN ('hive', 'crop_block')", name=op.f("ck_farm_units_kind")),
    )
    op.create_index("ix_farm_units_farm_id", "farm_units", ["farm_id"])
    op.create_table(
        "account_deletions",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(16), server_default="pending", nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error_code", sa.String(64), nullable=True),
        *timestamps(),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_account_deletions")),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_account_deletions_user_id_users")
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'completed')", name=op.f("ck_account_deletions_status")
        ),
    )
    op.create_index(
        "ix_account_deletions_status_next_attempt_at",
        "account_deletions",
        ["status", "next_attempt_at"],
    )


def downgrade() -> None:
    op.drop_table("account_deletions")
    op.drop_table("farm_units")
    op.drop_table("farms")
    op.drop_table("chat_profiles")
