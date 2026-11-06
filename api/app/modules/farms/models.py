from uuid import UUID

from sqlalchemy import CheckConstraint, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.ids import uuid7
from app.db.models import Base, TimestampMixin


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

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[UUID]
    name: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(16))
    state: Mapped[str | None] = mapped_column(String(80))
    lga: Mapped[str | None] = mapped_column(String(100))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)


class FarmUnit(TimestampMixin, Base):
    __tablename__ = "farm_units"
    __table_args__ = (
        UniqueConstraint("farm_id", "client_id"),
        CheckConstraint("kind IN ('hive', 'crop_block')", name="kind"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)
    farm_id: Mapped[UUID] = mapped_column(ForeignKey("farms.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[UUID]
    kind: Mapped[str] = mapped_column(String(16))
    name: Mapped[str] = mapped_column(String(120))
    details: Mapped[dict[str, str | float | None]] = mapped_column(JSONB)
