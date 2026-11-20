from __future__ import annotations

from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import CheckConstraint, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.ids import uuid7
from app.db.models import Base, TimestampMixin

if TYPE_CHECKING:
    from app.db.models import DailyBriefing, PredictiveAlert, Scan
    from app.modules.assistant.models import AssistantThread
    from app.modules.users.models import User


class Farm(TimestampMixin, Base):
    __tablename__ = "farms"
    __table_args__ = (
        UniqueConstraint("user_id", "client_id"),
        CheckConstraint("kind IN ('crops', 'bees', 'both')", name="kind"),
        CheckConstraint(
            "(lat IS NULL AND lng IS NULL) OR "
            "(lat IS NOT NULL AND lng IS NOT NULL AND lat BETWEEN -90 AND 90 "
            "AND lng BETWEEN -180 AND 180)",
            name="coordinates",
        ),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7)
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    client_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    state: Mapped[str | None] = mapped_column(String(80), nullable=True)
    lga: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    user: Mapped[User] = relationship(back_populates="farms")
    units: Mapped[list[FarmUnit]] = relationship(
        back_populates="farm", cascade="all, delete-orphan"
    )
    scans: Mapped[list[Scan]] = relationship(back_populates="farm")
    assistant_threads: Mapped[list[AssistantThread]] = relationship(back_populates="farm")
    daily_briefings: Mapped[list[DailyBriefing]] = relationship(back_populates="farm")
    predictive_alerts: Mapped[list[PredictiveAlert]] = relationship(back_populates="farm")


class FarmUnit(TimestampMixin, Base):
    __tablename__ = "farm_units"
    __table_args__ = (
        UniqueConstraint("farm_id", "client_id"),
        CheckConstraint("kind IN ('hive', 'crop_block')", name="kind"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7)
    farm_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("farms.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    client_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    details: Mapped[dict[str, Any]] = mapped_column(JSONB(), nullable=False, default=dict)

    farm: Mapped[Farm] = relationship(back_populates="units")
    scans: Mapped[list[Scan]] = relationship(back_populates="unit")
    assistant_threads: Mapped[list[AssistantThread]] = relationship(back_populates="unit")
