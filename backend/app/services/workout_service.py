"""Workout Domain Business Logic: Plans, Exercise Catalog, Sessions, and Set Logs."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import delete, func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AccessForbiddenException, EntityNotFoundException
from app.models.user import User
from app.models.workout import ExerciseItem, ExerciseSetLog, WorkoutPlan, WorkoutSession
from app.schemas.workout import (
    CreateExerciseItemRequest,
    CreateWorkoutPlanRequest,
    CreateWorkoutSessionRequest,
    ExerciseItemResponse,
    ExerciseSetLogItem,
    ExerciseSetLogResponse,
    UpdateExerciseItemRequest,
    UpdateSetLogsRequest,
    UpdateWorkoutSessionRequest,
    WorkoutPlanDetailResponse,
    WorkoutPlanResponse,
    WorkoutSessionDetailResponse,
    WorkoutSessionResponse,
)


def map_exercise_response(ex: ExerciseItem) -> ExerciseItemResponse:
    """Maps ExerciseItem model to response schema."""
    return ExerciseItemResponse(
        id=ex.id,
        workoutPlanId=ex.workout_plan_id,
        name=ex.name,
        muscleGroup=ex.muscle_group,
        defaultSets=ex.default_sets,
        defaultReps=ex.default_reps,
        defaultLoadKg=float(ex.default_load_kg),
        restSeconds=ex.rest_seconds,
        notes=ex.notes,
        sortOrder=ex.sort_order,
        createdByUserId=ex.created_by_user_id,
    )


def map_set_log_response(log: ExerciseSetLog) -> ExerciseSetLogResponse:
    """Maps ExerciseSetLog model to response schema."""
    return ExerciseSetLogResponse(
        id=log.id,
        workoutSessionId=log.workout_session_id,
        exerciseItemId=log.exercise_item_id,
        exerciseName=log.exercise_name,
        setNumber=log.set_number,
        targetReps=log.target_reps,
        targetLoadKg=float(log.target_load_kg),
        actualReps=log.actual_reps,
        actualLoadKg=float(log.actual_load_kg) if log.actual_load_kg is not None else None,
        completed=log.completed,
        createdAt=log.created_at,
    )


def map_session_response(s: WorkoutSession) -> WorkoutSessionResponse:
    """Maps WorkoutSession model to response schema."""
    return WorkoutSessionResponse(
        id=s.id,
        userId=s.user_id,
        workoutPlanId=s.workout_plan_id,
        sessionTitle=s.session_title,
        dateLogged=s.date_logged.isoformat(),
        durationMinutes=s.duration_minutes,
        caloriesBurned=s.calories_burned,
        rpe=s.rpe,
        notes=s.notes,
        completed=s.completed,
        createdAt=s.created_at,
    )


class WorkoutService:
    """Manages workout plans, exercise catalog, execution sessions, and set logging."""

    @staticmethod
    async def list_workout_plans(
        db: AsyncSession,
        pathway: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> List[WorkoutPlanResponse]:
        stmt = select(WorkoutPlan)
        if user_id is not None:
            stmt = stmt.where(
                (WorkoutPlan.is_system_template == True) | (WorkoutPlan.created_by_user_id == user_id)  # noqa: E712
            )
        else:
            stmt = stmt.where(WorkoutPlan.is_system_template == True)  # noqa: E712

        if pathway:
            stmt = stmt.where(
                (WorkoutPlan.recommended_pathway == pathway) | (WorkoutPlan.is_system_template == True)  # noqa: E712
            )
        stmt = stmt.order_by(WorkoutPlan.title.asc())
        plans = (await db.scalars(stmt)).all()

        return [
            WorkoutPlanResponse(
                id=p.id,
                title=p.title,
                dayLabel=p.day_label,
                focusArea=p.focus_area,
                estimatedMinutes=p.estimated_minutes,
                intensityLabel=p.intensity_label,
                targetCaloriesBurned=p.target_calories_burned,
                recommendedPathway=p.recommended_pathway,
                isSystemTemplate=p.is_system_template,
                createdByUserId=p.created_by_user_id,
                createdAt=p.created_at,
            )
            for p in plans
        ]

    @staticmethod
    async def get_workout_plan(
        db: AsyncSession,
        plan_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
    ) -> WorkoutPlanDetailResponse:
        stmt = (
            select(WorkoutPlan)
            .options(selectinload(WorkoutPlan.exercises))
            .where(WorkoutPlan.id == plan_id)
        )
        plan = await db.scalar(stmt)
        if not plan:
            raise EntityNotFoundException(f"Workout plan '{plan_id}' not found.")

        if not plan.is_system_template and (user_id is None or plan.created_by_user_id != user_id):
            raise AccessForbiddenException("You do not have permission to access this workout plan.")

        visible_exercises = [
            ex
            for ex in plan.exercises
            if ex.created_by_user_id is None or (user_id is not None and ex.created_by_user_id == user_id)
        ]
        visible_exercises.sort(key=lambda item: (item.sort_order, item.name))
        exercises = [map_exercise_response(ex) for ex in visible_exercises]
        return WorkoutPlanDetailResponse(
            id=plan.id,
            title=plan.title,
            dayLabel=plan.day_label,
            focusArea=plan.focus_area,
            estimatedMinutes=plan.estimated_minutes,
            intensityLabel=plan.intensity_label,
            targetCaloriesBurned=plan.target_calories_burned,
            recommendedPathway=plan.recommended_pathway,
            isSystemTemplate=plan.is_system_template,
            createdByUserId=plan.created_by_user_id,
            createdAt=plan.created_at,
            exercises=exercises,
        )

    @staticmethod
    async def create_workout_plan(
        db: AsyncSession,
        payload: CreateWorkoutPlanRequest,
        user_id: uuid.UUID,
    ) -> WorkoutPlanDetailResponse:
        plan = WorkoutPlan(
            title=payload.title.strip(),
            day_label=payload.dayLabel.strip(),
            focus_area=payload.focusArea.strip(),
            estimated_minutes=payload.estimatedMinutes,
            intensity_label=payload.intensityLabel,
            target_calories_burned=payload.targetCaloriesBurned,
            recommended_pathway=payload.recommendedPathway,
            is_system_template=False,
            created_by_user_id=user_id,
        )
        db.add(plan)
        await db.flush()

        for idx, ex_data in enumerate(payload.exercises):
            ex = ExerciseItem(
                workout_plan_id=plan.id,
                created_by_user_id=user_id,
                name=ex_data.name.strip(),
                muscle_group=ex_data.muscleGroup.strip(),
                default_sets=ex_data.defaultSets,
                default_reps=ex_data.defaultReps,
                default_load_kg=Decimal(str(ex_data.defaultLoadKg)),
                rest_seconds=ex_data.restSeconds,
                notes=ex_data.notes,
                sort_order=ex_data.sortOrder if ex_data.sortOrder != 0 else idx + 1,
            )
            db.add(ex)

        await db.commit()
        return await WorkoutService.get_workout_plan(db, plan.id, user_id=user_id)

    @staticmethod
    async def delete_workout_plan(
        db: AsyncSession,
        plan_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        plan = await db.get(WorkoutPlan, plan_id)
        if not plan:
            raise EntityNotFoundException(f"Workout plan '{plan_id}' not found.")

        if plan.is_system_template:
            raise AccessForbiddenException("System workout templates cannot be deleted.")

        if plan.created_by_user_id != user_id:
            raise AccessForbiddenException("You do not have permission to delete this workout plan.")

        await db.delete(plan)
        await db.commit()

    @staticmethod
    async def list_exercises(
        db: AsyncSession,
        muscle_group: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> List[ExerciseItemResponse]:
        stmt = select(ExerciseItem)
        if user_id is not None:
            stmt = stmt.where(
                or_(
                    ExerciseItem.created_by_user_id.is_(None),
                    ExerciseItem.created_by_user_id == user_id,
                )
            )
        else:
            stmt = stmt.where(ExerciseItem.created_by_user_id.is_(None))
        if muscle_group and muscle_group.strip():
            stmt = stmt.where(func.lower(ExerciseItem.muscle_group) == muscle_group.strip().lower())
        stmt = stmt.order_by(ExerciseItem.name.asc())
        exercises = (await db.scalars(stmt)).all()

        return [map_exercise_response(ex) for ex in exercises]

    @staticmethod
    async def get_exercise_by_id(
        db: AsyncSession,
        exercise_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
    ) -> ExerciseItemResponse:
        ex = await db.get(ExerciseItem, exercise_id)
        if not ex:
            raise EntityNotFoundException(f"Exercise item '{exercise_id}' not found.")
        if ex.created_by_user_id is not None and (user_id is None or ex.created_by_user_id != user_id):
            raise AccessForbiddenException("You do not have permission to access this exercise.")
        return map_exercise_response(ex)

    @staticmethod
    async def add_exercise_to_plan(
        db: AsyncSession,
        plan_id: uuid.UUID,
        user_id: uuid.UUID,
        payload: CreateExerciseItemRequest,
    ) -> ExerciseItemResponse:
        plan = await db.get(WorkoutPlan, plan_id)
        if not plan:
            raise EntityNotFoundException(f"Workout plan '{plan_id}' not found.")
        if not plan.is_system_template and plan.created_by_user_id != user_id:
            raise AccessForbiddenException("You do not have permission to add exercises to this workout plan.")

        sort_order = payload.sortOrder
        if sort_order == 0:
            max_order = await db.scalar(
                select(func.coalesce(func.max(ExerciseItem.sort_order), 0)).where(
                    ExerciseItem.workout_plan_id == plan_id
                )
            )
            sort_order = int(max_order or 0) + 1

        ex = ExerciseItem(
            workout_plan_id=plan_id,
            created_by_user_id=user_id,
            name=payload.name.strip(),
            muscle_group=payload.muscleGroup.strip(),
            default_sets=payload.defaultSets,
            default_reps=payload.defaultReps.strip(),
            default_load_kg=Decimal(str(payload.defaultLoadKg)),
            rest_seconds=payload.restSeconds,
            notes=payload.notes.strip() if payload.notes else None,
            sort_order=sort_order,
        )
        db.add(ex)
        await db.commit()
        await db.refresh(ex)
        return map_exercise_response(ex)

    @staticmethod
    async def update_exercise(
        db: AsyncSession,
        exercise_id: uuid.UUID,
        user_id: uuid.UUID,
        payload: UpdateExerciseItemRequest,
    ) -> ExerciseItemResponse:
        ex = await db.get(ExerciseItem, exercise_id)
        if not ex:
            raise EntityNotFoundException(f"Exercise item '{exercise_id}' not found.")
        if ex.created_by_user_id is None:
            raise AccessForbiddenException("System exercise templates cannot be modified.")
        if ex.created_by_user_id != user_id:
            raise AccessForbiddenException("You do not have permission to modify this exercise.")

        if payload.name is not None:
            ex.name = payload.name.strip()
        if payload.muscleGroup is not None:
            ex.muscle_group = payload.muscleGroup.strip()
        if payload.defaultSets is not None:
            ex.default_sets = payload.defaultSets
        if payload.defaultReps is not None:
            ex.default_reps = payload.defaultReps.strip()
        if payload.defaultLoadKg is not None:
            ex.default_load_kg = Decimal(str(payload.defaultLoadKg))
        if payload.restSeconds is not None:
            ex.rest_seconds = payload.restSeconds
        if payload.notes is not None:
            ex.notes = payload.notes.strip() or None
        if payload.sortOrder is not None:
            ex.sort_order = payload.sortOrder

        await db.commit()
        await db.refresh(ex)
        return map_exercise_response(ex)

    @staticmethod
    async def delete_exercise(
        db: AsyncSession,
        exercise_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        ex = await db.get(ExerciseItem, exercise_id)
        if not ex:
            raise EntityNotFoundException(f"Exercise item '{exercise_id}' not found.")
        if ex.created_by_user_id is None:
            raise AccessForbiddenException("System exercise templates cannot be deleted.")
        if ex.created_by_user_id != user_id:
            raise AccessForbiddenException("You do not have permission to delete this exercise.")

        await db.delete(ex)
        await db.commit()

    @staticmethod
    async def create_workout_session(
        db: AsyncSession,
        current_user: User,
        payload: CreateWorkoutSessionRequest,
    ) -> WorkoutSessionResponse:
        if payload.workoutPlanId:
            plan = await db.get(WorkoutPlan, payload.workoutPlanId)
            if not plan:
                raise EntityNotFoundException(f"Workout plan '{payload.workoutPlanId}' not found.")
            if not plan.is_system_template and plan.created_by_user_id != current_user.id:
                raise AccessForbiddenException("You do not have permission to link this workout plan.")

        date_obj = date.fromisoformat(payload.dateLogged)
        session = WorkoutSession(
            user_id=current_user.id,
            workout_plan_id=payload.workoutPlanId,
            session_title=payload.sessionTitle.strip(),
            date_logged=date_obj,
            duration_minutes=payload.durationMinutes,
            calories_burned=payload.caloriesBurned,
            rpe=payload.rpe,
            notes=payload.notes,
            completed=payload.completed,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return map_session_response(session)

    @staticmethod
    async def list_workout_sessions(
        db: AsyncSession,
        current_user: User,
        days: int = 30,
        completed: Optional[bool] = None,
    ) -> List[WorkoutSessionResponse]:
        days = min(max(days, 1), 365)
        cutoff = date.today() - timedelta(days=days)

        stmt = select(WorkoutSession).where(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.date_logged >= cutoff,
        )
        if completed is not None:
            stmt = stmt.where(WorkoutSession.completed == completed)

        stmt = stmt.order_by(WorkoutSession.date_logged.desc(), WorkoutSession.created_at.desc())
        sessions = (await db.scalars(stmt)).all()
        return [map_session_response(s) for s in sessions]

    @staticmethod
    async def get_workout_session(
        db: AsyncSession,
        current_user: User,
        session_id: uuid.UUID,
    ) -> WorkoutSessionDetailResponse:
        stmt = (
            select(WorkoutSession)
            .options(selectinload(WorkoutSession.set_logs))
            .where(WorkoutSession.id == session_id)
        )
        session = await db.scalar(stmt)
        if not session:
            raise EntityNotFoundException(f"Workout session '{session_id}' not found.")

        if session.user_id != current_user.id:
            raise AccessForbiddenException("You do not have permission to access this workout session.")

        base_resp = map_session_response(session)
        set_logs = [map_set_log_response(lg) for lg in session.set_logs]
        return WorkoutSessionDetailResponse(
            **base_resp.model_dump(),
            setLogs=set_logs,
        )

    @staticmethod
    async def update_workout_session(
        db: AsyncSession,
        current_user: User,
        session_id: uuid.UUID,
        payload: UpdateWorkoutSessionRequest,
    ) -> WorkoutSessionResponse:
        session = await db.get(WorkoutSession, session_id)
        if not session:
            raise EntityNotFoundException(f"Workout session '{session_id}' not found.")

        if session.user_id != current_user.id:
            raise AccessForbiddenException("You do not have permission to modify this workout session.")

        if payload.sessionTitle is not None:
            session.session_title = payload.sessionTitle.strip()
        if payload.dateLogged is not None:
            session.date_logged = date.fromisoformat(payload.dateLogged)
        if payload.durationMinutes is not None:
            session.duration_minutes = payload.durationMinutes
        if payload.caloriesBurned is not None:
            session.calories_burned = payload.caloriesBurned
        if payload.rpe is not None:
            session.rpe = payload.rpe
        if payload.notes is not None:
            session.notes = payload.notes
        if payload.completed is not None:
            session.completed = payload.completed

        await db.commit()
        await db.refresh(session)
        return map_session_response(session)

    @staticmethod
    async def delete_workout_session(
        db: AsyncSession,
        current_user: User,
        session_id: uuid.UUID,
    ) -> None:
        session = await db.get(WorkoutSession, session_id)
        if not session:
            raise EntityNotFoundException(f"Workout session '{session_id}' not found.")

        if session.user_id != current_user.id:
            raise AccessForbiddenException("You do not have permission to delete this workout session.")

        await db.delete(session)
        await db.commit()

    @staticmethod
    async def upsert_set_logs(
        db: AsyncSession,
        current_user: User,
        session_id: uuid.UUID,
        payload: UpdateSetLogsRequest,
    ) -> List[ExerciseSetLogResponse]:
        session = await db.get(WorkoutSession, session_id)
        if not session:
            raise EntityNotFoundException(f"Workout session '{session_id}' not found.")

        if session.user_id != current_user.id:
            raise AccessForbiddenException("You do not have permission to log sets for this session.")

        if not payload.setLogs:
            return []

        ref_ids = {item.exerciseItemId for item in payload.setLogs if item.exerciseItemId is not None}
        if ref_ids:
            found_ids = set(
                (
                    await db.scalars(
                        select(ExerciseItem.id).where(
                            ExerciseItem.id.in_(ref_ids),
                            or_(
                                ExerciseItem.created_by_user_id.is_(None),
                                ExerciseItem.created_by_user_id == current_user.id,
                            ),
                        )
                    )
                ).all()
            )
            missing = ref_ids - found_ids
            if missing:
                raise EntityNotFoundException(
                    f"Referenced exercise item(s) not found: {sorted(str(x) for x in missing)}"
                )

        # Deduplicate by (exercise_name, set_number) keeping the latest entry so
        # PostgreSQL ON CONFLICT DO UPDATE cannot raise CardinalityViolationError.
        deduped_map: dict[tuple[str, int], dict] = {}
        for item in payload.setLogs:
            deduped_map[(item.exerciseName, item.setNumber)] = {
                "workout_session_id": session_id,
                "exercise_item_id": item.exerciseItemId,
                "exercise_name": item.exerciseName,
                "set_number": item.setNumber,
                "target_reps": item.targetReps,
                "target_load_kg": Decimal(str(item.targetLoadKg)),
                "actual_reps": item.actualReps,
                "actual_load_kg": Decimal(str(item.actualLoadKg)) if item.actualLoadKg is not None else None,
                "completed": item.completed,
            }
        values_list = list(deduped_map.values())

        insert_stmt = pg_insert(ExerciseSetLog).values(values_list)
        upsert_stmt = insert_stmt.on_conflict_do_update(
            constraint="uq_set_log_per_session",
            set_={
                "exercise_item_id": insert_stmt.excluded.exercise_item_id,
                "target_reps": insert_stmt.excluded.target_reps,
                "target_load_kg": insert_stmt.excluded.target_load_kg,
                "actual_reps": insert_stmt.excluded.actual_reps,
                "actual_load_kg": insert_stmt.excluded.actual_load_kg,
                "completed": insert_stmt.excluded.completed,
            },
        )
        await db.execute(upsert_stmt)
        await db.commit()

        # Query all logs ordered by set_number
        query_logs = (
            select(ExerciseSetLog)
            .where(ExerciseSetLog.workout_session_id == session_id)
            .order_by(ExerciseSetLog.exercise_name.asc(), ExerciseSetLog.set_number.asc())
        )
        saved_logs = (await db.scalars(query_logs)).all()
        return [map_set_log_response(lg) for lg in saved_logs]
