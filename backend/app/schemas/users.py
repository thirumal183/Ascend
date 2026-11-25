"""Pydantic v2 schemas for User Profile, Pathway Switching, and Nutrition Goals."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ActivityLevel, Archetype, BiologicalSex, GoalType, PathwayType, UnitSystem
from app.schemas.auth import NutritionGoalResponse, UserProfileResponse


class UpdateUserProfileRequest(BaseModel):
    """Partial or complete user biometric profile update payload."""

    model_config = ConfigDict(populate_by_name=True)

    fullName: Optional[str] = Field(default=None, min_length=1, max_length=100)
    pathway: Optional[PathwayType] = None
    archetype: Optional[Archetype] = None
    goalType: Optional[GoalType] = None
    biologicalSex: Optional[BiologicalSex] = None
    unitSystem: Optional[UnitSystem] = None
    currentWeightKg: Optional[float] = Field(default=None, gt=20.0, lt=400.0)
    targetWeightKg: Optional[float] = Field(default=None, gt=20.0, lt=400.0)
    heightCm: Optional[float] = Field(default=None, gt=50.0, lt=280.0)
    age: Optional[int] = Field(default=None, ge=13, le=120)
    activityLevel: Optional[ActivityLevel] = None
    trainingDaysPerWeek: Optional[int] = Field(default=None, ge=0, le=7)
    recalculateGoals: bool = True


class SwitchPathwayRequest(BaseModel):
    """Pathway switch and optional macro/calorie target override payload requiring password confirmation."""

    model_config = ConfigDict(populate_by_name=True)

    pathway: PathwayType
    currentPassword: str = Field(..., min_length=1, max_length=128)
    archetype: Optional[Archetype] = None
    goalType: Optional[GoalType] = None
    recalculateGoals: bool = True
    customCalorieAdjustment: Optional[int] = Field(default=None, ge=-1000, le=1000)
    customProteinPerKg: Optional[float] = Field(default=None, ge=1.2, le=2.5)


class UpdateNutritionGoalsRequest(BaseModel):
    """Direct user customization of daily nutrition and activity targets."""

    model_config = ConfigDict(populate_by_name=True)

    dailyCalories: int = Field(ge=1200, le=6000)
    proteinG: float = Field(gt=0.0, le=500.0)
    carbsG: float = Field(ge=0.0, le=1000.0)
    fatG: float = Field(gt=0.0, le=300.0)
    waterMl: int = Field(ge=500, le=10000)
    dailySteps: int = Field(default=10000, ge=1000, le=50000)
    weeklyWorkoutSessions: int = Field(default=3, ge=0, le=14)
    weeklyActivityMinutes: int = Field(default=150, ge=0, le=2000)


class UserProfileAndGoalsResponse(BaseModel):
    """Composite response returning updated profile and active nutrition goals."""

    userProfile: UserProfileResponse
    nutritionGoals: NutritionGoalResponse
