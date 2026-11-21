from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, MetaData, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.modules.farms.models import Farm, FarmUnit
    from app.modules.users.models import User

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Scan(Base, TimestampMixin):
    __tablename__ = "scans"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    farm_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("farms.id", ondelete="SET NULL"), nullable=True
    )
    unit_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("farm_units.id", ondelete="SET NULL"), nullable=True
    )
    subject: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="queued")
    result: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True)
    prompt_version: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False)
    client_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)

    user: Mapped[User] = relationship(back_populates="scans")
    farm: Mapped[Farm] = relationship(back_populates="scans")
    unit: Mapped[FarmUnit] = relationship(back_populates="scans")
    images: Mapped[list[ScanImage]] = relationship(
        back_populates="scan", cascade="all, delete-orphan"
    )


class ScanImage(Base, TimestampMixin):
    __tablename__ = "scan_images"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    scan_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False
    )
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    width: Mapped[int | None] = mapped_column(nullable=True)
    height: Mapped[int | None] = mapped_column(nullable=True)
    order: Mapped[int] = mapped_column(nullable=False)

    scan: Mapped[Scan] = relationship(back_populates="images")


class AssistantThread(Base, TimestampMixin):
    __tablename__ = "assistant_threads"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    farm_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("farms.id", ondelete="SET NULL"), nullable=True
    )
    unit_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("farm_units.id", ondelete="SET NULL"), nullable=True
    )

    user: Mapped[User] = relationship(back_populates="assistant_threads")
    farm: Mapped[Farm] = relationship(back_populates="assistant_threads")
    unit: Mapped[FarmUnit] = relationship(back_populates="assistant_threads")
    messages: Mapped[list[AssistantMessage]] = relationship(
        back_populates="thread", cascade="all, delete-orphan"
    )


class AssistantMessage(Base, TimestampMixin):
    __tablename__ = "assistant_messages"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    thread_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("assistant_threads.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    body: Mapped[str] = mapped_column(nullable=False)
    attachments: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True)
    safety: Mapped[dict[str, Any] | None] = mapped_column(JSONB(), nullable=True)
    feedback: Mapped[str | None] = mapped_column(String(16), nullable=True)

    thread: Mapped[AssistantThread] = relationship(back_populates="messages")


class DailyBriefing(Base, TimestampMixin):
    __tablename__ = "daily_briefings"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    farm_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False
    )
    local_date: Mapped[date] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[dict[str, Any]] = mapped_column(JSONB(), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(32), nullable=False)
    weather_observed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship(back_populates="daily_briefings")
    farm: Mapped[Farm] = relationship(back_populates="daily_briefings")


class PredictiveAlert(Base, TimestampMixin):
    __tablename__ = "predictive_alerts"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    farm_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("farms.id", ondelete="SET NULL"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
    evidence: Mapped[dict[str, Any]] = mapped_column(JSONB(), nullable=False)
    rule_version: Mapped[str] = mapped_column(String(32), nullable=False)
    forecast_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    forecast_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False)

    user: Mapped[User] = relationship(back_populates="predictive_alerts")
    farm: Mapped[Farm] = relationship(back_populates="predictive_alerts")
