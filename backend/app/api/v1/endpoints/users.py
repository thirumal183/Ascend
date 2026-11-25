"""User Profile, Pathway Switching, and Nutrition Goals Endpoints."""

from __future__ import annotations

import asyncio
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import (
    AccessForbiddenException,
    AuthenticationException,
    EntityNotFoundException,
)
from app.core.rate_limit import rate_limit
from app.core.security import verify_password
from app.models.enums import ActivityLevel, BiologicalSex, GoalType, PathwayType
from app.models.user import NutritionGoal, User, UserProfile
from app.schemas.auth import NutritionGoalResponse, UserProfileResponse
from app.schemas.users import (
    SwitchPathwayRequest,
    UpdateNutritionGoalsRequest,
    UpdateUserProfileRequest,
    UserProfileAndGoalsResponse,
)
from app.services.nutrition_calculator import compute_recommended_targets

router = APIRouter()


def _map_profile_response(profile: UserProfile) -> UserProfileResponse:
    return UserProfileResponse(
        id=profile.id,
        userId=profile.user_id,
        pathway=profile.pathway,
        archetype=profile.archetype,
        goalType=profile.goal_type,
        biologicalSex=profile.biological_sex,
        unitSystem=profile.unit_system,
        currentWeightKg=float(profile.current_weight_kg),
        targetWeightKg=float(profile.target_weight_kg),
        heightCm=float(profile.height_cm),
        age=profile.age,
        activityLevel=profile.activity_level,
        trainingDaysPerWeek=profile.training_days_per_week,
        targetCalorieAdjustment=profile.target_calorie_adjustment,
        proteinGPerKg=float(profile.protein_g_per_kg),
        waterMlPerKg=float(profile.water_ml_per_kg),
        updatedAt=profile.updated_at,
    )


def _map_goals_response(goals: NutritionGoal) -> NutritionGoalResponse:
    return NutritionGoalResponse(
        id=goals.id,
        userId=goals.user_id,
        dailyCalories=goals.daily_calories,
        proteinG=float(goals.protein_g),
        carbsG=float(goals.carbs_g),
        fatG=float(goals.fat_g),
        waterMl=goals.water_ml,
        dailySteps=goals.daily_steps,
        weeklyWorkoutSessions=goals.weekly_workout_sessions,
        weeklyActivityMinutes=goals.weekly_activity_minutes,
        updatedAt=goals.updated_at,
    )


async def _load_profile_and_goals(
    db: AsyncSession,
    user_id,
) -> tuple[UserProfile, NutritionGoal]:
    profile = await db.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
    goals = await db.scalar(select(NutritionGoal).where(NutritionGoal.user_id == user_id))
    if not profile or not goals:
        raise EntityNotFoundException("User profile or nutrition goals not found.")
    return profile, goals


def _recalculate_goals_from_profile(
    profile: UserProfile,
    goals: NutritionGoal,
    custom_calorie_adjustment: int | None = None,
    custom_protein_per_kg: float | None = None,
) -> None:
    cals, prot, carbs, fat, water, prot_per_kg, water_per_kg = compute_recommended_targets(
        weight_kg=float(profile.current_weight_kg),
        height_cm=float(profile.height_cm),
        age=profile.age,
        biological_sex=BiologicalSex(profile.biological_sex),
        activity_level=ActivityLevel(profile.activity_level),
        pathway=PathwayType(profile.pathway),
        goal_type=GoalType(profile.goal_type),
        custom_calorie_adjustment=custom_calorie_adjustment,
        custom_protein_per_kg=custom_protein_per_kg,
    )
    profile.protein_g_per_kg = prot_per_kg
    profile.water_ml_per_kg = water_per_kg
    goals.daily_calories = cals
    goals.protein_g = prot
    goals.carbs_g = carbs
    goals.fat_g = fat
    goals.water_ml = water
    goals.weekly_workout_sessions = profile.training_days_per_week
    goals.weekly_activity_minutes = profile.training_days_per_week * 45


@router.put(
    "/me/profile",
    response_model=UserProfileAndGoalsResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user biometric profile and optionally recalculate targets",
)
async def update_my_profile(
    payload: UpdateUserProfileRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserProfileAndGoalsResponse:
    profile, goals = await _load_profile_and_goals(db, current_user.id)

    if payload.fullName is not None:
        current_user.full_name = payload.fullName.strip()
    if payload.pathway is not None and payload.pathway.value != profile.pathway:
        raise AccessForbiddenException(
            "Pathway changes require password confirmation via Settings."
        )
    if payload.archetype is not None:
        profile.archetype = payload.archetype.value
    if payload.goalType is not None:
        profile.goal_type = payload.goalType.value
    if payload.biologicalSex is not None:
        profile.biological_sex = payload.biologicalSex.value
    if payload.unitSystem is not None:
        profile.unit_system = payload.unitSystem.value
    if payload.currentWeightKg is not None:
        profile.current_weight_kg = Decimal(str(payload.currentWeightKg))
    if payload.targetWeightKg is not None:
        profile.target_weight_kg = Decimal(str(payload.targetWeightKg))
    if payload.heightCm is not None:
        profile.height_cm = Decimal(str(payload.heightCm))
    if payload.age is not None:
        profile.age = payload.age
    if payload.activityLevel is not None:
        profile.activity_level = payload.activityLevel.value
    if payload.trainingDaysPerWeek is not None:
        profile.training_days_per_week = payload.trainingDaysPerWeek

    if payload.recalculateGoals:
        _recalculate_goals_from_profile(profile, goals)

    await db.commit()
    await db.refresh(profile)
    await db.refresh(goals)

    return UserProfileAndGoalsResponse(
        userProfile=_map_profile_response(profile),
        nutritionGoals=_map_goals_response(goals),
    )


@router.post(
    "/me/pathway",
    response_model=UserProfileAndGoalsResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit("users_pathway_change", max_requests=10, window_seconds=60))],
    summary="Switch active pathway with current password confirmation",
)
async def switch_my_pathway(
    payload: SwitchPathwayRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserProfileAndGoalsResponse:
    is_valid = await asyncio.to_thread(verify_password, payload.currentPassword, current_user.password_hash)
    if not is_valid:
        raise AuthenticationException("Current password is incorrect.")

    profile, goals = await _load_profile_and_goals(db, current_user.id)

    profile.pathway = payload.pathway.value
    if payload.archetype is not None:
        profile.archetype = payload.archetype.value
    elif payload.pathway == PathwayType.ATHLETE_PERFORMANCE:
        profile.archetype = "Athlete Performance"
    else:
        profile.archetype = "General Fitness & Lifestyle"

    if payload.goalType is not None:
        profile.goal_type = payload.goalType.value
    elif payload.pathway == PathwayType.MUSCLE_GAIN:
        profile.goal_type = GoalType.MUSCLE_GAIN.value
    elif payload.pathway == PathwayType.ATHLETE_PERFORMANCE:
        profile.goal_type = GoalType.ATHLETIC_PERFORMANCE.value
    else:
        profile.goal_type = GoalType.WEIGHT_LOSS.value

    if payload.recalculateGoals:
        _recalculate_goals_from_profile(
            profile,
            goals,
            custom_calorie_adjustment=payload.customCalorieAdjustment,
            custom_protein_per_kg=payload.customProteinPerKg,
        )

    await db.commit()
    await db.refresh(profile)
    await db.refresh(goals)

    return UserProfileAndGoalsResponse(
        userProfile=_map_profile_response(profile),
        nutritionGoals=_map_goals_response(goals),
    )


@router.put(
    "/me/goals",
    response_model=NutritionGoalResponse,
    status_code=status.HTTP_200_OK,
    summary="Update custom daily nutrition and activity goals",
)
async def update_my_goals(
    payload: UpdateNutritionGoalsRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> NutritionGoalResponse:
    profile, goals = await _load_profile_and_goals(db, current_user.id)

    goals.daily_calories = payload.dailyCalories
    goals.protein_g = Decimal(str(round(payload.proteinG, 1)))
    goals.carbs_g = Decimal(str(round(payload.carbsG, 1)))
    goals.fat_g = Decimal(str(round(payload.fatG, 1)))
    goals.water_ml = payload.waterMl
    goals.daily_steps = payload.dailySteps
    goals.weekly_workout_sessions = payload.weeklyWorkoutSessions
    goals.weekly_activity_minutes = payload.weeklyActivityMinutes

    # Sync protein g/kg telemetry on profile
    weight_kg = float(profile.current_weight_kg)
    if weight_kg > 0:
        profile.protein_g_per_kg = Decimal(str(round(payload.proteinG / weight_kg, 2)))

    await db.commit()
    await db.refresh(goals)
    return _map_goals_response(goals)
