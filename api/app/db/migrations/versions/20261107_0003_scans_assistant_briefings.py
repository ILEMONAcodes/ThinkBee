"""Add scans, assistant threads, briefings, and predictive alerts."""

from collections.abc import Sequence
from datetime import datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261107_0003"
down_revision: str | None = "20261106_0002"
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
        "scans",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=True),
        sa.Column("unit_id", sa.Uuid(), nullable=True),
        sa.Column("subject", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("result", postgresql.JSONB(), nullable=True),
        sa.Column("prompt_version", sa.String(32), nullable=False),
        sa.Column("model", sa.String(64), nullable=False),
        sa.Column("client_id", sa.Uuid(), nullable=False),
        *timestamps(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_scans")),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_scans_user_id_users"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["farm_id"], ["farms.id"], name=op.f("fk_scans_farm_id_farms"), ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["unit_id"],
            ["farm_units.id"],
            name=op.f("fk_scans_unit_id_farm_units"),
            ondelete="SET NULL",
        ),
        sa.CheckConstraint("subject IN ('hive', 'crop')", name=op.f("ck_scans_subject")),
        sa.CheckConstraint(
            "status IN ('queued', 'analysing', 'done', 'failed')", name=op.f("ck_scans_status")
        ),
        sa.UniqueConstraint("user_id", "client_id", name=op.f("uq_scans_user_id")),
    )
    op.create_index("ix_scans_user_id", "scans", ["user_id"])
    op.create_index("ix_scans_farm_id", "scans", ["farm_id"])

    op.create_table(
        "scan_images",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("scan_id", sa.Uuid(), nullable=False),
        sa.Column("storage_key", sa.String(512), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False),
        *timestamps(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_scan_images")),
        sa.ForeignKeyConstraint(
            ["scan_id"], ["scans.id"], name=op.f("fk_scan_images_scan_id_scans"), ondelete="CASCADE"
        ),
    )
    op.create_index("ix_scan_images_scan_id", "scan_images", ["scan_id"])

    op.create_table(
        "assistant_threads",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=True),
        sa.Column("unit_id", sa.Uuid(), nullable=True),
        *timestamps(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assistant_threads")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_assistant_threads_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["farm_id"],
            ["farms.id"],
            name=op.f("fk_assistant_threads_farm_id_farms"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["unit_id"],
            ["farm_units.id"],
            name=op.f("fk_assistant_threads_unit_id_farm_units"),
            ondelete="SET NULL",
        ),
    )
    op.create_index("ix_assistant_threads_user_id", "assistant_threads", ["user_id"])

    op.create_table(
        "assistant_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("thread_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("attachments", postgresql.JSONB(), nullable=True),
        sa.Column("safety", postgresql.JSONB(), nullable=True),
        sa.Column("feedback", sa.String(16), nullable=True),
        *timestamps(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assistant_messages")),
        sa.ForeignKeyConstraint(
            ["thread_id"],
            ["assistant_threads.id"],
            name=op.f("fk_assistant_messages_thread_id_assistant_threads"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "role IN ('user', 'assistant')", name=op.f("ck_assistant_messages_role")
        ),
        sa.CheckConstraint(
            "feedback IS NULL OR feedback IN ('up', 'down')",
            name=op.f("ck_assistant_messages_feedback"),
        ),
    )
    op.create_index("ix_assistant_messages_thread_id", "assistant_messages", ["thread_id"])

    op.create_table(
        "daily_briefings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=False),
        sa.Column("local_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("content", postgresql.JSONB(), nullable=False),
        sa.Column("prompt_version", sa.String(32), nullable=False),
        sa.Column("weather_observed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_daily_briefings")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_daily_briefings_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["farm_id"],
            ["farms.id"],
            name=op.f("fk_daily_briefings_farm_id_farms"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "status IN ('ready', 'limited', 'unavailable')", name=op.f("ck_daily_briefings_status")
        ),
        sa.UniqueConstraint(
            "user_id", "farm_id", "local_date", name=op.f("uq_daily_briefings_user_farm_date")
        ),
    )
    op.create_index("ix_daily_briefings_user_id", "daily_briefings", ["user_id"])
    op.create_index("ix_daily_briefings_farm_id", "daily_briefings", ["farm_id"])

    op.create_table(
        "predictive_alerts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("farm_id", sa.Uuid(), nullable=True),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("risk_level", sa.String(16), nullable=False),
        sa.Column("evidence", postgresql.JSONB(), nullable=False),
        sa.Column("rule_version", sa.String(32), nullable=False),
        sa.Column("forecast_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("forecast_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        *timestamps(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_predictive_alerts")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_predictive_alerts_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["farm_id"],
            ["farms.id"],
            name=op.f("fk_predictive_alerts_farm_id_farms"),
            ondelete="SET NULL",
        ),
        sa.CheckConstraint(
            "risk_level IN ('low', 'medium', 'high')", name=op.f("ck_predictive_alerts_risk_level")
        ),
        sa.CheckConstraint(
            "state IN ('pending', 'sent', 'read', 'expired')",
            name=op.f("ck_predictive_alerts_state"),
        ),
    )
    op.create_index("ix_predictive_alerts_user_id", "predictive_alerts", ["user_id"])
    op.create_index("ix_predictive_alerts_farm_id", "predictive_alerts", ["farm_id"])
    op.create_index(
        "ix_predictive_alerts_user_farm_state_expires",
        "predictive_alerts",
        ["user_id", "farm_id", "state", "expires_at"],
    )


def downgrade() -> None:
    op.drop_table("predictive_alerts")
    op.drop_table("daily_briefings")
    op.drop_table("assistant_messages")
    op.drop_table("assistant_threads")
    op.drop_table("scan_images")
    op.drop_table("scans")
