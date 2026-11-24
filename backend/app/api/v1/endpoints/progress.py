"""Progress and Biometric Telemetry Domain API Endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.progress import (
    CreateProgressRecordRequest,
    ProgressRecordResponse,
    ProgressSummaryResponse,
    UpdateProgressRecordRequest,
)
from app.services.progress_service import ProgressService

router = APIRouter()


@router.get(
    "/records",
    response_model=List[ProgressRecordResponse],
    status_code=status.HTTP_200_OK,
    summary="List biometric progress records",
)
async def list_progress_records(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=28, ge=1, le=365, description="Rolling time window in days"),
) -> List[ProgressRecordResponse]:
    """Returns chronological progress checkpoints for the authenticated user."""
    return await ProgressService.list_progress_records(
        db=db,
        current_user=current_user,
        days=days,
    )


@router.post(
    "/records",
    response_model=ProgressRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log or upsert daily biometric checkpoint",
)
async def create_progress_record(
    payload: CreateProgressRecordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProgressRecordResponse:
    """Logs weight, body fat %, measurements, and activity telemetry for a date."""
    return await ProgressService.create_or_upsert_progress_record(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.get(
    "/records/{record_id}",
    response_model=ProgressRecordResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve single biometric progress record",
)
async def get_progress_record(
    record_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProgressRecordResponse:
    """Returns detailed biometric measurements for a specific progress checkpoint."""
    return await ProgressService.get_progress_record(
        db=db,
        current_user=current_user,
        record_id=record_id,
    )


@router.put(
    "/records/{record_id}",
    response_model=ProgressRecordResponse,
    status_code=status.HTTP_200_OK,
    summary="Update existing progress record",
)
async def update_progress_record(
    record_id: uuid.UUID,
    payload: UpdateProgressRecordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProgressRecordResponse:
    """Modifies logged weight or body measurements for a checkpoint."""
    return await ProgressService.update_progress_record(
        db=db,
        current_user=current_user,
        record_id=record_id,
        payload=payload,
    )


@router.delete(
    "/records/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a progress record",
)
async def delete_progress_record(
    record_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Removes a progress checkpoint."""
    await ProgressService.delete_progress_record(
        db=db,
        current_user=current_user,
        record_id=record_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/summary",
    response_model=ProgressSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve progress trend metrics and statistical summary",
)
async def get_progress_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=28, ge=1, le=365, description="Time window in days"),
) -> ProgressSummaryResponse:
    """Calculates weight delta, body fat delta, average activity, and completed workouts."""
    return await ProgressService.get_progress_summary(
        db=db,
        current_user=current_user,
        days=days,
    )
