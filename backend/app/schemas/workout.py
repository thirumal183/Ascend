"""Pydantic v2 schemas for Workout Templates, Exercise Definitions & Session Logs."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ExerciseItemResponse(BaseModel):
    """Exercise definition schema."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    workoutPlanId: uuid.UUID
    name: str
    muscleGroup: str
    defaultSets: int
    defaultReps: str
    defaultLoadKg: float
    restSeconds: int
    notes: Optional[str] = None
    sortOrder: int
    createdByUserId: Optional[uuid.UUID] = None


class CreateExerciseItemRequest(BaseModel):
    """Exercise creation schema inside a workout plan."""

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=1, max_length=150)
    muscleGroup: str = Field(min_length=1, max_length=100)
    defaultSets: int = Field(default=3, gt=0)
    defaultReps: str = Field(default="8-12", max_length=50)
    defaultLoadKg: float = Field(default=0.0, ge=0.0)
    restSeconds: int = Field(default=60, ge=0)
    notes: Optional[str] = None
    sortOrder: int = Field(default=0)


class UpdateExerciseItemRequest(BaseModel):
    """Payload to update a user-created exercise item."""

    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    muscleGroup: Optional[str] = Field(default=None, min_length=1, max_length=100)
    defaultSets: Optional[int] = Field(default=None, gt=0, le=30)
    defaultReps: Optional[str] = Field(default=None, min_length=1, max_length=50)
    defaultLoadKg: Optional[float] = Field(default=None, ge=0.0, le=1000.0)
    restSeconds: Optional[int] = Field(default=None, ge=0, le=600)
    notes: Optional[str] = None
    sortOrder: Optional[int] = Field(default=None, ge=0)


class WorkoutPlanResponse(BaseModel):
    """Workout plan summary schema."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    title: str
    dayLabel: str
    focusArea: str
    estimatedMinutes: int
    intensityLabel: str
    targetCaloriesBurned: int
    recommendedPathway: Optional[
        Literal["General Nutrition & Diet", "Athlete Performance", "Weight Gain & Muscle Gain"]
    ] = None
    isSystemTemplate: bool
    createdByUserId: Optional[uuid.UUID] = None
    createdAt: datetime


class WorkoutPlanDetailResponse(WorkoutPlanResponse):
    """Workout plan details with ordered exercise item checklist."""

    exercises: List[ExerciseItemResponse] = Field(default_factory=list)


class CreateWorkoutPlanRequest(BaseModel):
    """Workout plan creation payload."""

    model_config = ConfigDict(populate_by_name=True)

    title: str = Field(min_length=1, max_length=150)
    dayLabel: str = Field(default="Day 1", max_length=50)
    focusArea: str = Field(min_length=1, max_length=100)
    estimatedMinutes: int = Field(default=45, gt=0)
    intensityLabel: str = Field(default="Moderate", pattern=r"^(Low|Moderate|High|Peak Performance)$")
    targetCaloriesBurned: int = Field(default=300, ge=0)
    recommendedPathway: Optional[
        Literal["General Nutrition & Diet", "Athlete Performance", "Weight Gain & Muscle Gain"]
    ] = None
    exercises: List[CreateExerciseItemRequest] = Field(default_factory=list)


class ExerciseSetLogItem(BaseModel):
    """Set log payload for an individual exercise set."""

    model_config = ConfigDict(populate_by_name=True)

    exerciseItemId: Optional[uuid.UUID] = None
    exerciseName: str = Field(min_length=1, max_length=150)
    setNumber: int = Field(gt=0)
    targetReps: str = Field(default="8-10", max_length=50)
    targetLoadKg: float = Field(default=0.0, ge=0.0)
    actualReps: Optional[int] = Field(default=None, ge=0)
    actualLoadKg: Optional[float] = Field(default=None, ge=0.0)
    completed: bool = Field(default=False)


class ExerciseSetLogResponse(BaseModel):
    """Confirmed execution set log schema."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    workoutSessionId: uuid.UUID
    exerciseItemId: Optional[uuid.UUID] = None
    exerciseName: str
    setNumber: int
    targetReps: str
    targetLoadKg: float
    actualReps: Optional[int] = None
    actualLoadKg: Optional[float] = None
    completed: bool
    createdAt: datetime


class UpdateSetLogsRequest(BaseModel):
    """Batch set logs submission for a workout session."""

    model_config = ConfigDict(populate_by_name=True)

    setLogs: List[ExerciseSetLogItem]


class WorkoutSessionResponse(BaseModel):
    """Workout session log summary schema."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    userId: uuid.UUID
    workoutPlanId: Optional[uuid.UUID] = None
    sessionTitle: str
    dateLogged: str
    durationMinutes: int
    caloriesBurned: int
    rpe: Optional[int] = None
    notes: Optional[str] = None
    completed: bool
    createdAt: datetime


class WorkoutSessionDetailResponse(WorkoutSessionResponse):
    """Workout session details with executed set logs."""

    setLogs: List[ExerciseSetLogResponse] = Field(default_factory=list)


class CreateWorkoutSessionRequest(BaseModel):
    """Payload to log a workout session."""

    model_config = ConfigDict(populate_by_name=True)

    workoutPlanId: Optional[uuid.UUID] = None
    sessionTitle: str = Field(min_length=1, max_length=150)
    dateLogged: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    durationMinutes: int = Field(gt=0)
    caloriesBurned: int = Field(default=0, ge=0)
    rpe: Optional[int] = Field(default=None, ge=1, le=10)
    notes: Optional[str] = None
    completed: bool = Field(default=False)


class UpdateWorkoutSessionRequest(BaseModel):
    """Payload to modify an existing workout session."""

    model_config = ConfigDict(populate_by_name=True)

    sessionTitle: Optional[str] = Field(default=None, min_length=1, max_length=150)
    dateLogged: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    durationMinutes: Optional[int] = Field(default=None, gt=0)
    caloriesBurned: Optional[int] = Field(default=None, ge=0)
    rpe: Optional[int] = Field(default=None, ge=1, le=10)
    notes: Optional[str] = None
    completed: Optional[bool] = None
