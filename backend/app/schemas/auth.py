"""Pydantic v2 schemas for Authentication and Session Management."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import (
    ActivityLevel,
    Archetype,
    BiologicalSex,
    GoalType,
    PathwayType,
    UnitSystem,
)


class TokenResponse(BaseModel):
    """Dual-token response schema for successful authentication or rotation."""

    model_config = ConfigDict(populate_by_name=True)

    accessToken: str = Field(description="Stateless signed JWT access token")
    refreshToken: str = Field(description="High-entropy opaque refresh token")
    tokenType: str = Field(default="Bearer", description="Authorization header scheme")
    expiresIn: int = Field(default=1800, description="Access token lifespan in seconds (30 min)")


class UserResponse(BaseModel):
    """Public user identity projection."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    email: str
    fullName: str
    isActive: bool
    jwtVersion: int


class UserRegisterRequest(BaseModel):
    """User account registration and physiological baseline input."""

    model_config = ConfigDict(populate_by_name=True)

    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", description="Account email address")
    password: str = Field(min_length=8, max_length=128, description="Minimum 8 characters, max 128")
    fullName: str = Field(min_length=1, max_length=100)
    pathway: PathwayType = Field(default=PathwayType.GENERAL_NUTRITION)
    archetype: Archetype = Field(default=Archetype.GENERAL_FITNESS)
    goalType: GoalType = Field(default=GoalType.WEIGHT_LOSS)
    biologicalSex: BiologicalSex = Field(default=BiologicalSex.UNSPECIFIED)
    currentWeightKg: float = Field(gt=20.0, lt=400.0)
    targetWeightKg: float = Field(gt=20.0, lt=400.0)
    heightCm: float = Field(gt=50.0, lt=280.0)
    age: int = Field(ge=13, le=120)
    activityLevel: ActivityLevel = Field(default=ActivityLevel.MODERATELY_ACTIVE)
    unitSystem: UnitSystem = Field(default=UnitSystem.METRIC)
    trainingDaysPerWeek: int = Field(default=3, ge=0, le=7)


class RegisterResponse(BaseModel):
    """Response returned upon successful account registration."""

    user: UserResponse
    tokens: TokenResponse


class LoginRequest(BaseModel):
    """Credential login payload accepting either username or email."""

    username: str = Field(max_length=255, description="Account email address")
    password: str = Field(max_length=128, description="Plaintext account password")


class TokenRefreshRequest(BaseModel):
    """Refresh token rotation exchange request."""

    refreshToken: str = Field(description="Active opaque refresh token string")


class LogoutRequest(BaseModel):
    """Logout request optionally scoping revocation to a single device session."""

    refreshToken: Optional[str] = Field(default=None, description="Opaque refresh token of the logging-out device")


class SessionItem(BaseModel):
    """Individual active device session telemetry."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    deviceInfo: Optional[str] = None
    ipAddress: Optional[str] = None
    createdAt: datetime
    expiresAt: datetime
    isCurrent: bool = False


class SessionListResponse(BaseModel):
    """List of all registered active refresh sessions for the authenticated user."""

    sessions: List[SessionItem]


class UserProfileResponse(BaseModel):
    """Demographic and physiological parameters projection."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    userId: uuid.UUID
    pathway: str
    archetype: str
    goalType: str
    biologicalSex: str
    unitSystem: str
    currentWeightKg: float
    targetWeightKg: float
    heightCm: float
    age: int
    activityLevel: str
    trainingDaysPerWeek: int
    targetCalorieAdjustment: int
    proteinGPerKg: float
    waterMlPerKg: float
    updatedAt: datetime


class NutritionGoalResponse(BaseModel):
    """Current target nutrition benchmarks projection."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    userId: uuid.UUID
    dailyCalories: int
    proteinG: float
    carbsG: float
    fatG: float
    waterMl: int
    dailySteps: int
    weeklyWorkoutSessions: int
    weeklyActivityMinutes: int
    updatedAt: datetime


class AuthMeResponse(BaseModel):
    """Composite authenticated user state."""

    account: UserResponse
    userProfile: Optional[UserProfileResponse] = None
    nutritionGoals: Optional[NutritionGoalResponse] = None
