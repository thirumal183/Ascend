"""Domain 1: User Identity, Security, Demographic Profiles & Nutrition Goals."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
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
    from app.models.nutrition import FoodItem, IntakeRecord, WaterIntakeRecord
    from app.models.workout import WorkoutSession
    from app.models.progress import ProgressRecord
    from app.models.chat import ChatConversation, ChatMessage


class User(Base):
    """Core user entity with Argon2id password hash and token versioning."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    is_demo_account: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    jwt_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default=text("1"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            r"email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'",
            name="ck_users_email_format",
        ),
    )

    # Relationships
    profile: Mapped[Optional[UserProfile]] = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    nutrition_goals: Mapped[Optional[NutritionGoal]] = relationship(
        "NutritionGoal",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    refresh_sessions: Mapped[List[UserRefreshSession]] = relationship(
        "UserRefreshSession",
        foreign_keys="UserRefreshSession.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    intake_records: Mapped[List[IntakeRecord]] = relationship(
        "IntakeRecord",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    water_intake_records: Mapped[List[WaterIntakeRecord]] = relationship(
        "WaterIntakeRecord",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    workout_sessions: Mapped[List[WorkoutSession]] = relationship(
        "WorkoutSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    progress_records: Mapped[List[ProgressRecord]] = relationship(
        "ProgressRecord",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    chat_conversations: Mapped[List[ChatConversation]] = relationship(
        "ChatConversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    chat_messages: Mapped[List[ChatMessage]] = relationship(
        "ChatMessage",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    custom_foods: Mapped[List[FoodItem]] = relationship(
        "FoodItem",
        back_populates="created_by_user",
    )


class UserRefreshSession(Base):
    """Persistent refresh token session supporting rotation lineage and reuse detection."""

    __tablename__ = "user_refresh_sessions"

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
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    replaced_by_token_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_refresh_sessions.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_refresh_sessions_hash"),
    )

    # Relationships
    user: Mapped[User] = relationship("User", foreign_keys=[user_id], back_populates="refresh_sessions")
    replaced_by: Mapped[Optional[UserRefreshSession]] = relationship(
        "UserRefreshSession",
        remote_side=[id],
        foreign_keys=[replaced_by_token_id],
    )


class UserProfile(Base):
    """User physiological parameters, active pathway, demographic baseline and configurable targets."""

    __tablename__ = "user_profiles"

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
        unique=True,
        index=True,
    )
    pathway: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="General Nutrition & Diet",
        server_default=text("'General Nutrition & Diet'"),
    )
    archetype: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="General Fitness & Lifestyle",
        server_default=text("'General Fitness & Lifestyle'"),
    )
    goal_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Weight Loss",
        server_default=text("'Weight Loss'"),
    )
    biological_sex: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="unspecified",
        server_default=text("'unspecified'"),
    )
    unit_system: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="Metric (kg, cm, ml)",
        server_default=text("'Metric (kg, cm, ml)'"),
    )
    current_weight_kg: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    target_weight_kg: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    height_cm: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    activity_level: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="Moderately Active",
        server_default=text("'Moderately Active'"),
    )
    training_days_per_week: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=3,
        server_default=text("3"),
    )
    target_calorie_adjustment: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    protein_g_per_kg: Mapped[Decimal] = mapped_column(
        Numeric(3, 2),
        nullable=False,
        default=Decimal("1.80"),
        server_default=text("1.80"),
    )
    water_ml_per_kg: Mapped[Decimal] = mapped_column(
        Numeric(4, 1),
        nullable=False,
        default=Decimal("36.0"),
        server_default=text("36.0"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_profiles_user_id"),
        CheckConstraint(
            "pathway IN ('General Nutrition & Diet', 'Athlete Performance', 'Weight Gain & Muscle Gain')",
            name="ck_profile_pathway",
        ),
        CheckConstraint(
            "archetype IN ('General Fitness & Lifestyle', 'Athlete Performance')",
            name="ck_profile_archetype",
        ),
        CheckConstraint(
            "goal_type IN ('Weight Loss', 'Weight Maintenance', 'Weight & Muscle Gain', 'Athletic Performance')",
            name="ck_profile_goal_type",
        ),
        CheckConstraint(
            "biological_sex IN ('male', 'female', 'unspecified')",
            name="ck_profile_biological_sex",
        ),
        CheckConstraint(
            "current_weight_kg > 20.0 AND current_weight_kg < 400.0 AND target_weight_kg > 20.0 AND target_weight_kg < 400.0",
            name="ck_profile_weights",
        ),
        CheckConstraint(
            "height_cm > 50.0 AND height_cm < 280.0",
            name="ck_profile_height",
        ),
        CheckConstraint(
            "age >= 13 AND age <= 120",
            name="ck_profile_age",
        ),
        CheckConstraint(
            "training_days_per_week BETWEEN 0 AND 7",
            name="ck_profile_training_days",
        ),
        CheckConstraint(
            "protein_g_per_kg BETWEEN 1.0 AND 3.5",
            name="ck_profile_protein_target",
        ),
        CheckConstraint(
            "water_ml_per_kg BETWEEN 20.0 AND 70.0",
            name="ck_profile_water_target",
        ),
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="profile")


class NutritionGoal(Base):
    """Daily nutrition and weekly fitness target benchmarks for active pathway."""

    __tablename__ = "nutrition_goals"

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
        unique=True,
        index=True,
    )
    daily_calories: Mapped[int] = mapped_column(Integer, nullable=False)
    protein_g: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    carbs_g: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    fat_g: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    water_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    daily_steps: Mapped[int] = mapped_column(Integer, nullable=False, default=10000, server_default=text("10000"))
    weekly_workout_sessions: Mapped[int] = mapped_column(Integer, nullable=False, default=3, server_default=text("3"))
    weekly_activity_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=150, server_default=text("150"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_nutrition_goals_user_id"),
        CheckConstraint("daily_calories >= 800 AND daily_calories <= 10000", name="ck_goals_calories"),
        CheckConstraint("protein_g >= 0 AND carbs_g >= 0 AND fat_g >= 0", name="ck_goals_macros"),
        CheckConstraint("water_ml >= 500 AND water_ml <= 15000", name="ck_goals_water"),
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="nutrition_goals")
