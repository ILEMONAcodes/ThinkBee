from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, text
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
