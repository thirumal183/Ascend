"""Health and system readiness endpoints."""

from fastapi import APIRouter, Response, status
from app.core.config import settings
from app.core.database import check_database_connection
from app.schemas.health import (
    DatabaseErrorResponse,
    DatabaseReadinessResponse,
    HealthResponse,
)

router = APIRouter(tags=["System Health & Diagnostics"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Application Health Probe",
    description="Returns standard heartbeat indicating FastAPI service is running.",
)
async def health_check() -> HealthResponse:
    """Basic service liveness probe."""
    return HealthResponse(
        status="ok",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )


@router.get(
    "/health/db",
    response_model=DatabaseReadinessResponse | DatabaseErrorResponse,
    responses={
        status.HTTP_200_OK: {
            "model": DatabaseReadinessResponse,
            "description": "PostgreSQL database is connected and responsive.",
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": DatabaseErrorResponse,
            "description": "PostgreSQL database connection failed.",
        },
    },
    summary="Database Readiness Probe",
    description="Executes a live 'SELECT 1' against PostgreSQL to verify connectivity.",
)
async def database_readiness_check(response: Response) -> DatabaseReadinessResponse | DatabaseErrorResponse:
    """Database connectivity and latency check."""
    is_connected, latency_ms, error_msg = await check_database_connection()

    if not is_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return DatabaseErrorResponse(
            status="unhealthy",
            database="disconnected",
            detail=error_msg or "Unable to establish connection to PostgreSQL.",
        )

    return DatabaseReadinessResponse(
        status="ready",
        database="connected",
        latency_ms=latency_ms or 0.0,
    )
