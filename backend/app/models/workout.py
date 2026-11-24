"""Domain 3: Workout Templates, Exercise Definitions & Execution Session Logs."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class WorkoutPlan(Base):
    """System template or user routine outlining training focus and exercises."""

    __tablename__ = "workout_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    day_label: Mapped[str] = mapped_column(String(50), nullable=False)
    focus_area: Mapped[str] = mapped_column(String(100), nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    intensity_label: Mapped[str] = mapped_column(String(30), nullable=False)
    target_calories_burned: Mapped[int] = mapped_column(Integer, nullable=False)
    recommended_pathway: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_system_template: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "intensity_label IN ('Low', 'Moderate', 'High', 'Peak Performance')",
            name="ck_workout_intensity",
        ),
        CheckConstraint(
            "recommended_pathway IS NULL OR recommended_pathway IN ('General Nutrition & Diet', 'Athlete Performance', 'Weight Gain & Muscle Gain')",
            name="ck_workout_pathway",
        ),
    )

    # Relationships
    creator: Mapped[Optional[User]] = relationship("User")
    exercises: Mapped[List[ExerciseItem]] = relationship(
        "ExerciseItem",
        back_populates="workout_plan",
        cascade="all, delete-orphan",
        order_by="ExerciseItem.sort_order",
    )
    sessions: Mapped[List[WorkoutSession]] = relationship(
        "WorkoutSession",
        back_populates="workout_plan",
    )


class ExerciseItem(Base):
    """Individual exercise specification within a workout plan template."""

    __tablename__ = "exercise_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    workout_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workout_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    muscle_group: Mapped[str] = mapped_column(String(100), nullable=False)
    default_sets: Mapped[int] = mapped_column(Integer, nullable=False)
    default_reps: Mapped[str] = mapped_column(String(50), nullable=False)
    default_load_kg: Mapped[Decimal] = mapped_column(
        Numeric(5, 1),
        nullable=False,
        default=Decimal("0.0"),
        server_default=text("0.0"),
    )
    rest_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=60, server_default=text("60"))
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))

    __table_args__ = (
        CheckConstraint("default_sets > 0", name="ck_exercise_sets"),
        CheckConstraint("rest_seconds >= 0", name="ck_exercise_rest"),
    )

    # Relationships
    workout_plan: Mapped[WorkoutPlan] = relationship("WorkoutPlan", back_populates="exercises")
    set_logs: Mapped[List[ExerciseSetLog]] = relationship("ExerciseSetLog", back_populates="exercise_item")


class WorkoutSession(Base):
    """Execution instance of a workout session completed by a user."""

    __tablename__ = "workout_sessions"

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
    workout_plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workout_plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    session_title: Mapped[str] = mapped_column(String(150), nullable=False)
    date_logged: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    calories_burned: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    rpe: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint("rpe IS NULL OR (rpe >= 1 AND rpe <= 10)", name="ck_workout_rpe"),
        Index("idx_workout_sessions_user_date", "user_id", text("date_logged DESC")),
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="workout_sessions")
    workout_plan: Mapped[Optional[WorkoutPlan]] = relationship("WorkoutPlan", back_populates="sessions")
    set_logs: Mapped[List[ExerciseSetLog]] = relationship(
        "ExerciseSetLog",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ExerciseSetLog.set_number",
    )


class ExerciseSetLog(Base):
    """Detailed performance telemetry for each exercise set executed in a workout session."""

    __tablename__ = "exercise_set_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    workout_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workout_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    exercise_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exercise_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    exercise_name: Mapped[str] = mapped_column(String(150), nullable=False)
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)
    target_reps: Mapped[str] = mapped_column(String(50), nullable=False)
    target_load_kg: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    actual_reps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    actual_load_kg: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 1), nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("workout_session_id", "exercise_name", "set_number", name="uq_set_log_per_session"),
        Index("idx_exercise_set_logs_session", "workout_session_id"),
    )

    # Relationships
    session: Mapped[WorkoutSession] = relationship("WorkoutSession", back_populates="set_logs")
    exercise_item: Mapped[Optional[ExerciseItem]] = relationship("ExerciseItem", back_populates="set_logs")
