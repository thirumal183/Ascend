"""Progress Domain Business Logic: Biometric Tracking, Progress Snapshots, and Trend Summaries."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AccessForbiddenException, EntityNotFoundException
from app.models.progress import ProgressRecord
from app.models.user import User
from app.schemas.progress import (
    CreateProgressRecordRequest,
    ProgressRecordResponse,
    ProgressSummaryResponse,
    UpdateProgressRecordRequest,
)


def map_progress_response(p: ProgressRecord) -> ProgressRecordResponse:
    """Maps ProgressRecord model to response schema."""
    return ProgressRecordResponse(
        id=p.id,
        userId=p.user_id,
        dateLogged=p.date_logged.isoformat(),
        label=p.label,
        weightKg=float(p.weight_kg),
        bodyFatPct=float(p.body_fat_pct) if p.body_fat_pct is not None else None,
        leanMassKg=float(p.lean_mass_kg) if p.lean_mass_kg is not None else None,
        waistCm=float(p.waist_cm) if p.waist_cm is not None else None,
        chestCm=float(p.chest_cm) if p.chest_cm is not None else None,
        armCm=float(p.arm_cm) if p.arm_cm is not None else None,
        thighCm=float(p.thigh_cm) if p.thigh_cm is not None else None,
        caloriesConsumed=p.calories_consumed,
        proteinConsumedG=float(p.protein_consumed_g),
        carbsConsumedG=float(p.carbs_consumed_g),
        fatConsumedG=float(p.fat_consumed_g),
        workoutCompleted=p.workout_completed,
        activityMinutes=p.activity_minutes,
        stepsCount=p.steps_count,
        createdAt=p.created_at,
    )


class ProgressService:
    """Biometric telemetry logging, upserting, and rolling trend summary service."""

    @staticmethod
    async def list_progress_records(
        db: AsyncSession,
        current_user: User,
        days: int = 28,
    ) -> List[ProgressRecordResponse]:
        days = min(max(days, 1), 365)
        cutoff = date.today() - timedelta(days=days)

        stmt = (
            select(ProgressRecord)
            .where(
                ProgressRecord.user_id == current_user.id,
                ProgressRecord.date_logged >= cutoff,
            )
            .order_by(ProgressRecord.date_logged.desc())
        )
        records = (await db.scalars(stmt)).all()
        return [map_progress_response(p) for p in records]

    @staticmethod
    async def get_progress_record(
        db: AsyncSession,
        current_user: User,
        record_id: uuid.UUID,
    ) -> ProgressRecordResponse:
        record = await db.get(ProgressRecord, record_id)
        if not record:
            raise EntityNotFoundException(f"Progress record '{record_id}' not found.")

        if record.user_id != current_user.id:
            raise AccessForbiddenException("You do not have permission to access this progress record.")

        return map_progress_response(record)

    @staticmethod
    async def create_or_upsert_progress_record(
        db: AsyncSession,
        current_user: User,
        payload: CreateProgressRecordRequest,
    ) -> ProgressRecordResponse:
        date_obj = date.fromisoformat(payload.dateLogged)
        provided = payload.model_fields_set

        insert_values = {
            "user_id": current_user.id,
            "date_logged": date_obj,
            "label": payload.label.strip(),
            "weight_kg": Decimal(str(payload.weightKg)),
            "body_fat_pct": Decimal(str(payload.bodyFatPct)) if payload.bodyFatPct is not None else None,
            "lean_mass_kg": Decimal(str(payload.leanMassKg)) if payload.leanMassKg is not None else None,
            "waist_cm": Decimal(str(payload.waistCm)) if payload.waistCm is not None else None,
            "chest_cm": Decimal(str(payload.chestCm)) if payload.chestCm is not None else None,
            "arm_cm": Decimal(str(payload.armCm)) if payload.armCm is not None else None,
            "thigh_cm": Decimal(str(payload.thighCm)) if payload.thighCm is not None else None,
            "calories_consumed": payload.caloriesConsumed,
            "protein_consumed_g": Decimal(str(payload.proteinConsumedG)),
            "carbs_consumed_g": Decimal(str(payload.carbsConsumedG)),
            "fat_consumed_g": Decimal(str(payload.fatConsumedG)),
            "workout_completed": payload.workoutCompleted,
            "activity_minutes": payload.activityMinutes,
            "steps_count": payload.stepsCount,
        }

        # Partial upsert: only overwrite columns explicitly included in the request payload
        field_to_col = {
            "label": "label",
            "weightKg": "weight_kg",
            "bodyFatPct": "body_fat_pct",
            "leanMassKg": "lean_mass_kg",
            "waistCm": "waist_cm",
            "chestCm": "chest_cm",
            "armCm": "arm_cm",
            "thighCm": "thigh_cm",
            "caloriesConsumed": "calories_consumed",
            "proteinConsumedG": "protein_consumed_g",
            "carbsConsumedG": "carbs_consumed_g",
            "fatConsumedG": "fat_consumed_g",
            "workoutCompleted": "workout_completed",
            "activityMinutes": "activity_minutes",
            "stepsCount": "steps_count",
        }
        update_set = {"weight_kg": insert_values["weight_kg"]}
        for schema_field, col_name in field_to_col.items():
            if schema_field in provided:
                update_set[col_name] = insert_values[col_name]

        stmt = (
            pg_insert(ProgressRecord)
            .values(**insert_values)
            .on_conflict_do_update(constraint="uq_progress_user_date", set_=update_set)
            .returning(ProgressRecord.id)
        )
        record_id = await db.scalar(stmt)
        await db.commit()
        record = await db.get(ProgressRecord, record_id)
        assert record is not None
        return map_progress_response(record)

    @staticmethod
    async def update_progress_record(
        db: AsyncSession,
        current_user: User,
        record_id: uuid.UUID,
        payload: UpdateProgressRecordRequest,
    ) -> ProgressRecordResponse:
        record = await db.get(ProgressRecord, record_id)
        if not record:
            raise EntityNotFoundException(f"Progress record '{record_id}' not found.")

        if record.user_id != current_user.id:
            raise AccessForbiddenException("You do not have permission to modify this progress record.")

        if payload.label is not None:
            record.label = payload.label.strip()
        if payload.weightKg is not None:
            record.weight_kg = Decimal(str(payload.weightKg))
        if payload.bodyFatPct is not None:
            record.body_fat_pct = Decimal(str(payload.bodyFatPct))
        if payload.leanMassKg is not None:
            record.lean_mass_kg = Decimal(str(payload.leanMassKg))
        if payload.waistCm is not None:
            record.waist_cm = Decimal(str(payload.waistCm))
        if payload.chestCm is not None:
            record.chest_cm = Decimal(str(payload.chestCm))
        if payload.armCm is not None:
            record.arm_cm = Decimal(str(payload.armCm))
        if payload.thighCm is not None:
            record.thigh_cm = Decimal(str(payload.thighCm))
        if payload.caloriesConsumed is not None:
            record.calories_consumed = payload.caloriesConsumed
        if payload.proteinConsumedG is not None:
            record.protein_consumed_g = Decimal(str(payload.proteinConsumedG))
        if payload.carbsConsumedG is not None:
            record.carbs_consumed_g = Decimal(str(payload.carbsConsumedG))
        if payload.fatConsumedG is not None:
            record.fat_consumed_g = Decimal(str(payload.fatConsumedG))
        if payload.workoutCompleted is not None:
            record.workout_completed = payload.workoutCompleted
        if payload.activityMinutes is not None:
            record.activity_minutes = payload.activityMinutes
        if payload.stepsCount is not None:
            record.steps_count = payload.stepsCount

        await db.commit()
        await db.refresh(record)
        return map_progress_response(record)

    @staticmethod
    async def delete_progress_record(
        db: AsyncSession,
        current_user: User,
        record_id: uuid.UUID,
    ) -> None:
        record = await db.get(ProgressRecord, record_id)
        if not record:
            raise EntityNotFoundException(f"Progress record '{record_id}' not found.")

        if record.user_id != current_user.id:
            raise AccessForbiddenException("You do not have permission to delete this progress record.")

        await db.delete(record)
        await db.commit()

    @staticmethod
    async def get_progress_summary(
        db: AsyncSession,
        current_user: User,
        days: int = 28,
    ) -> ProgressSummaryResponse:
        days = min(max(days, 1), 365)
        cutoff = date.today() - timedelta(days=days)

        stmt = (
            select(ProgressRecord)
            .where(
                ProgressRecord.user_id == current_user.id,
                ProgressRecord.date_logged >= cutoff,
            )
            .order_by(ProgressRecord.date_logged.asc())
        )
        records = (await db.scalars(stmt)).all()

        if not records:
            return ProgressSummaryResponse(
                days=days,
                recordsCount=0,
            )

        start_weight = float(records[0].weight_kg)
        curr_weight = float(records[-1].weight_kg)
        weight_delta = round(curr_weight - start_weight, 2)

        start_bf = float(records[0].body_fat_pct) if records[0].body_fat_pct is not None else None
        curr_bf = float(records[-1].body_fat_pct) if records[-1].body_fat_pct is not None else None
        bf_delta = round(curr_bf - start_bf, 1) if start_bf is not None and curr_bf is not None else None

        workouts_count = sum(1 for r in records if r.workout_completed)
        step_days = [r.steps_count for r in records if r.steps_count > 0]
        cal_days = [r.calories_consumed for r in records if r.calories_consumed > 0]
        avg_steps = int(sum(step_days) / len(step_days)) if step_days else 0
        avg_cals = int(sum(cal_days) / len(cal_days)) if cal_days else 0

        return ProgressSummaryResponse(
            days=days,
            recordsCount=len(records),
            startWeightKg=start_weight,
            currentWeightKg=curr_weight,
            weightDeltaKg=weight_delta,
            startBodyFatPct=start_bf,
            currentBodyFatPct=curr_bf,
            bodyFatDelta=bf_delta,
            totalWorkoutsCompleted=workouts_count,
            averageDailySteps=avg_steps,
            averageCaloriesConsumed=avg_cals,
        )
