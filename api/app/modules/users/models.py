from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.ids import uuid7
from app.db.models import Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'suspended', 'deleted')", name="status"),
        CheckConstraint("farmer_id ~ '^TB-[0-9A-HJKMNP-TV-Z]{8}$'", name="farmer_id_format"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)
    supabase_user_id: Mapped[UUID] = mapped_column(unique=True)
    farmer_id: Mapped[str] = mapped_column(String(11), unique=True)
    status: Mapped[str] = mapped_column(String(16), server_default="active")
    is_think_bee_admin: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    locale: Mapped[str] = mapped_column(String(16), server_default="en-NG")
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ChatProfile(TimestampMixin, Base):
    __tablename__ = "chat_profiles"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    display_name: Mapped[str] = mapped_column(String(80))
    photo_key: Mapped[str | None] = mapped_column(String(512))
    bio: Mapped[str] = mapped_column(String(280), server_default="")
    area_state: Mapped[str | None] = mapped_column(String(80))
    area_lga: Mapped[str | None] = mapped_column(String(100))
    show_crops: Mapped[bool] = mapped_column(server_default=text("false"))
    show_hive_type: Mapped[bool] = mapped_column(server_default=text("false"))


class AccountDeletion(TimestampMixin, Base):
    __tablename__ = "account_deletions"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'completed')", name="status"),
        Index("ix_account_deletions_status_next_attempt_at", "status", "next_attempt_at"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    status: Mapped[str] = mapped_column(String(16), server_default="pending")
    attempts: Mapped[int] = mapped_column(Integer, server_default="0")
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error_code: Mapped[str | None] = mapped_column(String(64))
