"""Domain 4: Daily Biometric Telemetry & Progress Records."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class ProgressRecord(Base):
    """Daily aggregated telemetry combining scale weight, body measurements, calories and activity."""

    __tablename__ = "progress_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date_logged: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    body_fat_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(4, 1), nullable=True)
    lean_mass_kg: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    waist_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 1), nullable=True)
    chest_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 1), nullable=True)
    arm_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 1), nullable=True)
    thigh_cm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 1), nullable=True)
    calories_consumed: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    protein_consumed_g: Mapped[Decimal] = mapped_column(
        Numeric(5, 1),
        nullable=False,
        default=Decimal("0.0"),
        server_default=text("0.0"),
    )
    carbs_consumed_g: Mapped[Decimal] = mapped_column(
        Numeric(5, 1),
        nullable=False,
        default=Decimal("0.0"),
        server_default=text("0.0"),
    )
    fat_consumed_g: Mapped[Decimal] = mapped_column(
        Numeric(5, 1),
        nullable=False,
        default=Decimal("0.0"),
        server_default=text("0.0"),
    )
    workout_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    activity_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    steps_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("user_id", "date_logged", name="uq_progress_user_date"),
        Index("idx_progress_user_date", "user_id", text("date_logged DESC")),
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="progress_records")
