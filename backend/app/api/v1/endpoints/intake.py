"""Meal Intake Logging, Daily Aggregation, and Historical Adherence Reports."""

from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.nutrition import (
    CreateIntakeRequest,
    CreateWaterIntakeRequest,
    DailyIntakeResponse,
    DailyWaterResponse,
    IntakeRecordResponse,
    IntakeReportResponse,
    UpdateIntakeRequest,
    UpdateWaterIntakeRequest,
    WaterIntakeRecordResponse,
)
from app.services.nutrition_service import IntakeService, WaterService

router = APIRouter()


@router.get(
    "/daily",
    response_model=DailyIntakeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user's daily meal intake log and totals",
)
async def get_daily_intake(
    date_iso: Annotated[str, Query(pattern=r"^\d{4}-\d{2}-\d{2}$", description="Target ISO date (YYYY-MM-DD)")],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DailyIntakeResponse:
    """Returns chronological meal entries and computed daily totals for the given date."""
    return await IntakeService.get_daily_intake(
        db=db,
        current_user=current_user,
        date_iso=date_iso,
    )


@router.post(
    "/records",
    response_model=IntakeRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log food consumption with immutable nutrient snapshot",
)
async def log_intake_record(
    payload: CreateIntakeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> IntakeRecordResponse:
    """Scales nutrients according to serving/unit and freezes snapshot in intake_records."""
    return await IntakeService.log_intake(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.put(
    "/records/{record_id}",
    response_model=IntakeRecordResponse,
    status_code=status.HTTP_200_OK,
    summary="Update existing intake record portion or meal details",
)
async def update_intake_record(
    record_id: uuid.UUID,
    payload: UpdateIntakeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> IntakeRecordResponse:
    """Modifies logged quantity/meal and automatically recalculates nutrient snapshot."""
    return await IntakeService.update_intake(
        db=db,
        current_user=current_user,
        record_id=record_id,
        payload=payload,
    )


@router.delete(
    "/records/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an intake record",
)
async def delete_intake_record(
    record_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Removes a previously logged consumption entry."""
    await IntakeService.delete_intake(
        db=db,
        current_user=current_user,
        record_id=record_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/reports",
    response_model=IntakeReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve rolling historical nutritional adherence report",
)
async def get_intake_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=7, ge=1, le=90, description="Rolling time window in days"),
) -> IntakeReportResponse:
    """Computes daily caloric totals, macronutrients, and deltas against active user goals."""
    return await IntakeService.get_reports(
        db=db,
        current_user=current_user,
        days=days,
    )


@router.get(
    "/water",
    response_model=DailyWaterResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user's daily water intake log and total",
)
async def get_daily_water(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    date_iso: Optional[str] = Query(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="ISO date YYYY-MM-DD (defaults to today)",
    ),
) -> DailyWaterResponse:
    """Fetches daily hydration entries and total milliliters for the given date."""
    from datetime import date as dt_date

    target_date = date_iso or dt_date.today().isoformat()
    return await WaterService.get_water_logs(
        db=db,
        current_user=current_user,
        date_iso=target_date,
    )


@router.post(
    "/water",
    response_model=WaterIntakeRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a new water intake entry",
)
async def log_water_intake(
    payload: CreateWaterIntakeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WaterIntakeRecordResponse:
    """Creates a persisted water intake entry."""
    return await WaterService.log_water(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.put(
    "/water/{record_id}",
    response_model=WaterIntakeRecordResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a logged water intake entry",
)
async def update_water_intake(
    record_id: uuid.UUID,
    payload: UpdateWaterIntakeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WaterIntakeRecordResponse:
    """Updates amount or notes on an owned water intake entry."""
    return await WaterService.update_water(
        db=db,
        current_user=current_user,
        record_id=record_id,
        payload=payload,
    )


@router.delete(
    "/water/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a logged water intake entry",
)
async def delete_water_intake(
    record_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Removes a previously logged water intake entry."""
    await WaterService.delete_water(
        db=db,
        current_user=current_user,
        record_id=record_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
