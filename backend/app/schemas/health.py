"""Pydantic schemas for health and system readiness endpoints."""

from datetime import datetime, timezone
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Schema for basic application health check."""

    status: str = Field(default="ok", description="Application service status")
    project: str = Field(description="Project display name")
    version: str = Field(description="Application version")
    environment: str = Field(description="Active runtime environment")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC check timestamp",
    )


class DatabaseReadinessResponse(BaseModel):
    """Schema for successful database readiness probe."""

    status: str = Field(default="ready", description="Overall health state")
    database: str = Field(default="connected", description="PostgreSQL connection state")
    latency_ms: float = Field(description="Round-trip latency in milliseconds")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC check timestamp",
    )


class DatabaseErrorResponse(BaseModel):
    """Schema for failed database readiness probe."""

    status: str = Field(default="unhealthy", description="Overall health state")
    database: str = Field(default="disconnected", description="PostgreSQL connection state")
    detail: str = Field(description="Error message detailing the connection failure")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC check timestamp",
    )
