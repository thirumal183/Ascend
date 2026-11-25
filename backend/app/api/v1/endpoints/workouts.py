"""Workout and Training Domain API Endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_optional_current_user, get_db
from app.models.user import User
from app.schemas.workout import (
    CreateExerciseItemRequest,
    CreateWorkoutPlanRequest,
    CreateWorkoutSessionRequest,
    ExerciseItemResponse,
    ExerciseSetLogResponse,
    UpdateExerciseItemRequest,
    UpdateSetLogsRequest,
    UpdateWorkoutSessionRequest,
    WorkoutPlanDetailResponse,
    WorkoutPlanResponse,
    WorkoutSessionDetailResponse,
    WorkoutSessionResponse,
)
from app.services.workout_service import WorkoutService

router = APIRouter()


# --- Workout Plans & Exercise Catalog ---

@router.get(
    "/plans",
    response_model=List[WorkoutPlanResponse],
    status_code=status.HTTP_200_OK,
    summary="List workout templates and plans",
)
async def list_workout_plans(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)] = None,
    pathway: Optional[str] = Query(default=None, description="Optional pathway filter"),
) -> List[WorkoutPlanResponse]:
    """Returns available system templates and the authenticated user's custom routines."""
    return await WorkoutService.list_workout_plans(
        db=db,
        pathway=pathway,
        user_id=current_user.id if current_user else None,
    )


@router.get(
    "/plans/{plan_id}",
    response_model=WorkoutPlanDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve workout plan details and exercise checklist",
)
async def get_workout_plan(
    plan_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)] = None,
) -> WorkoutPlanDetailResponse:
    """Returns full plan specifications including ordered exercise definitions."""
    return await WorkoutService.get_workout_plan(
        db=db,
        plan_id=plan_id,
        user_id=current_user.id if current_user else None,
    )


@router.post(
    "/plans",
    response_model=WorkoutPlanDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a custom workout plan",
)
async def create_workout_plan(
    payload: CreateWorkoutPlanRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WorkoutPlanDetailResponse:
    """Creates a custom workout routine owned by the authenticated user."""
    return await WorkoutService.create_workout_plan(
        db=db,
        payload=payload,
        user_id=current_user.id,
    )


@router.delete(
    "/plans/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a custom workout plan",
)
async def delete_workout_plan(
    plan_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Deletes an owned custom workout plan. System templates cannot be deleted."""
    await WorkoutService.delete_workout_plan(
        db=db,
        plan_id=plan_id,
        user_id=current_user.id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/exercises",
    response_model=List[ExerciseItemResponse],
    status_code=status.HTTP_200_OK,
    summary="List exercises in catalogue",
)
async def list_exercises(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)],
    muscle_group: Optional[str] = Query(default=None, description="Filter by muscle group"),
) -> List[ExerciseItemResponse]:
    """Returns catalog exercise specifications scoped to system templates and user-owned exercises."""
    return await WorkoutService.list_exercises(
        db=db,
        muscle_group=muscle_group,
        user_id=current_user.id if current_user else None,
    )


@router.get(
    "/exercises/{exercise_id}",
    response_model=ExerciseItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single exercise specification",
)
async def get_exercise(
    exercise_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)],
) -> ExerciseItemResponse:
    """Returns single exercise configuration and default set benchmarks with ownership check."""
    return await WorkoutService.get_exercise_by_id(
        db=db,
        exercise_id=exercise_id,
        user_id=current_user.id if current_user else None,
    )


@router.post(
    "/plans/{plan_id}/exercises",
    response_model=ExerciseItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an ad-hoc user-owned exercise to a workout plan",
)
async def add_exercise_to_plan(
    plan_id: uuid.UUID,
    payload: CreateExerciseItemRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExerciseItemResponse:
    """Persists a user-created exercise scoped to the authenticated user."""
    return await WorkoutService.add_exercise_to_plan(
        db=db,
        plan_id=plan_id,
        user_id=current_user.id,
        payload=payload,
    )


@router.put(
    "/exercises/{exercise_id}",
    response_model=ExerciseItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a user-owned exercise",
)
async def update_exercise(
    exercise_id: uuid.UUID,
    payload: UpdateExerciseItemRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExerciseItemResponse:
    """Updates a user-owned exercise while protecting system templates."""
    return await WorkoutService.update_exercise(
        db=db,
        exercise_id=exercise_id,
        user_id=current_user.id,
        payload=payload,
    )


@router.delete(
    "/exercises/{exercise_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user-owned exercise",
)
async def delete_exercise(
    exercise_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Deletes a user-owned exercise while protecting system templates."""
    await WorkoutService.delete_exercise(
        db=db,
        exercise_id=exercise_id,
        user_id=current_user.id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Workout Sessions & Set Execution Logs ---

@router.post(
    "/sessions",
    response_model=WorkoutSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a workout session",
)
async def create_workout_session(
    payload: CreateWorkoutSessionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WorkoutSessionResponse:
    """Creates a logged workout session execution record."""
    return await WorkoutService.create_workout_session(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.get(
    "/sessions",
    response_model=List[WorkoutSessionResponse],
    status_code=status.HTTP_200_OK,
    summary="List user's workout sessions",
)
async def list_workout_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=30, ge=1, le=365, description="Time window in days"),
    completed: Optional[bool] = Query(default=None, description="Filter by completion status"),
) -> List[WorkoutSessionResponse]:
    """Returns chronological workout history for the authenticated user."""
    return await WorkoutService.list_workout_sessions(
        db=db,
        current_user=current_user,
        days=days,
        completed=completed,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=WorkoutSessionDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get workout session details with set logs",
)
async def get_workout_session(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WorkoutSessionDetailResponse:
    """Retrieves session telemetry along with completed exercise set logs."""
    return await WorkoutService.get_workout_session(
        db=db,
        current_user=current_user,
        session_id=session_id,
    )


@router.put(
    "/sessions/{session_id}",
    response_model=WorkoutSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update workout session details",
)
async def update_workout_session(
    session_id: uuid.UUID,
    payload: UpdateWorkoutSessionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WorkoutSessionResponse:
    """Updates session duration, calories burned, RPE, or notes."""
    return await WorkoutService.update_workout_session(
        db=db,
        current_user=current_user,
        session_id=session_id,
        payload=payload,
    )


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a workout session",
)
async def delete_workout_session(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Removes a workout session and cascades deletion to all set logs."""
    await WorkoutService.delete_workout_session(
        db=db,
        current_user=current_user,
        session_id=session_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put(
    "/sessions/{session_id}/sets",
    response_model=List[ExerciseSetLogResponse],
    status_code=status.HTTP_200_OK,
    summary="Batch update or record exercise set logs",
)
async def upsert_set_logs(
    session_id: uuid.UUID,
    payload: UpdateSetLogsRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> List[ExerciseSetLogResponse]:
    """Upserts individual exercise set logs for a session within an ACID transaction."""
    return await WorkoutService.upsert_set_logs(
        db=db,
        current_user=current_user,
        session_id=session_id,
        payload=payload,
    )
