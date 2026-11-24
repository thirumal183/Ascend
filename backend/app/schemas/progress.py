"""Pydantic v2 schemas for Biometric Telemetry & Progress Records."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ProgressRecordResponse(BaseModel):
    """Daily biometric progress record schema."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    userId: uuid.UUID
    dateLogged: str
    label: str
    weightKg: float
    bodyFatPct: Optional[float] = None
    leanMassKg: Optional[float] = None
    waistCm: Optional[float] = None
    chestCm: Optional[float] = None
    armCm: Optional[float] = None
    thighCm: Optional[float] = None
    caloriesConsumed: int
    proteinConsumedG: float
    carbsConsumedG: float
    fatConsumedG: float
    workoutCompleted: bool
    activityMinutes: int
    stepsCount: int
    createdAt: datetime


class CreateProgressRecordRequest(BaseModel):
    """Payload to log or upsert a daily progress record."""

    model_config = ConfigDict(populate_by_name=True)

    dateLogged: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    label: str = Field(default="Daily Checkpoint", max_length=50)
    weightKg: float = Field(gt=20.0, lt=400.0)
    bodyFatPct: Optional[float] = Field(default=None, ge=2.0, le=70.0)
    leanMassKg: Optional[float] = Field(default=None, ge=15.0, le=300.0)
    waistCm: Optional[float] = Field(default=None, ge=30.0, le=250.0)
    chestCm: Optional[float] = Field(default=None, ge=40.0, le=250.0)
    armCm: Optional[float] = Field(default=None, ge=15.0, le=100.0)
    thighCm: Optional[float] = Field(default=None, ge=20.0, le=150.0)
    caloriesConsumed: int = Field(default=0, ge=0)
    proteinConsumedG: float = Field(default=0.0, ge=0.0)
    carbsConsumedG: float = Field(default=0.0, ge=0.0)
    fatConsumedG: float = Field(default=0.0, ge=0.0)
    workoutCompleted: bool = Field(default=False)
    activityMinutes: int = Field(default=0, ge=0)
    stepsCount: int = Field(default=0, ge=0)


class UpdateProgressRecordRequest(BaseModel):
    """Payload to update an existing biometric progress record."""

    model_config = ConfigDict(populate_by_name=True)

    label: Optional[str] = Field(default=None, max_length=50)
    weightKg: Optional[float] = Field(default=None, gt=20.0, lt=400.0)
    bodyFatPct: Optional[float] = Field(default=None, ge=2.0, le=70.0)
    leanMassKg: Optional[float] = Field(default=None, ge=15.0, le=300.0)
    waistCm: Optional[float] = Field(default=None, ge=30.0, le=250.0)
    chestCm: Optional[float] = Field(default=None, ge=40.0, le=250.0)
    armCm: Optional[float] = Field(default=None, ge=15.0, le=100.0)
    thighCm: Optional[float] = Field(default=None, ge=20.0, le=150.0)
    caloriesConsumed: Optional[int] = Field(default=None, ge=0)
    proteinConsumedG: Optional[float] = Field(default=None, ge=0.0)
    carbsConsumedG: Optional[float] = Field(default=None, ge=0.0)
    fatConsumedG: Optional[float] = Field(default=None, ge=0.0)
    workoutCompleted: Optional[bool] = None
    activityMinutes: Optional[int] = Field(default=None, ge=0)
    stepsCount: Optional[int] = Field(default=None, ge=0)


class ProgressSummaryResponse(BaseModel):
    """Time-series trend analysis over requested time window."""

    model_config = ConfigDict(populate_by_name=True)

    days: int
    recordsCount: int
    startWeightKg: Optional[float] = None
    currentWeightKg: Optional[float] = None
    weightDeltaKg: Optional[float] = None
    startBodyFatPct: Optional[float] = None
    currentBodyFatPct: Optional[float] = None
    bodyFatDelta: Optional[float] = None
    totalWorkoutsCompleted: int = 0
    averageDailySteps: int = 0
    averageCaloriesConsumed: int = 0
