"""Tests for application startup, health check, and database readiness probes."""

from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_informational_endpoint(async_client: AsyncClient):
    """Verifies the root endpoint returns API gateway metadata."""
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "ASCEND Nutrition & Fitness Platform"
    assert data["api_v1"] == "/api/v1"
    assert data["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient):
    """Verifies that the /api/v1/health endpoint returns status ok."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "timestamp" in data
    assert data["environment"] in ["development", "testing", "production"]


@pytest.mark.asyncio
async def test_database_readiness_success_mock(async_client: AsyncClient):
    """Verifies that /api/v1/health/db returns 200 ready when database connection succeeds (Mocked DB)."""
    with patch(
        "app.api.v1.endpoints.health.check_database_connection",
        new_callable=AsyncMock,
    ) as mock_check:
        mock_check.return_value = (True, 1.45, None)

        response = await async_client.get("/api/v1/health/db")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["database"] == "connected"
        assert data["latency_ms"] == 1.45


@pytest.mark.asyncio
async def test_database_readiness_failure_mock(async_client: AsyncClient):
    """Verifies that /api/v1/health/db returns 503 Service Unavailable when database connection fails (Mocked DB)."""
    with patch(
        "app.api.v1.endpoints.health.check_database_connection",
        new_callable=AsyncMock,
    ) as mock_check:
        mock_check.return_value = (False, None, "Connection refused at 127.0.0.1:5432")

        response = await async_client.get("/api/v1/health/db")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["database"] == "disconnected"
        assert "Connection refused" in data["detail"]


@pytest.mark.asyncio
async def test_database_readiness_live_attempt(async_client: AsyncClient):
    """Executes a real (unmocked) request to /api/v1/health/db.

    Note: Clearly distinguishes whether a real PostgreSQL database was reachable.
    If PostgreSQL is offline, verifies that HTTP 503 is returned rather than false 200.
    """
    response = await async_client.get("/api/v1/health/db")
    if response.status_code == 200:
        data = response.json()
        assert data["status"] == "ready"
        assert data["database"] == "connected"
        assert data["latency_ms"] >= 0
    else:
        # If real PostgreSQL is not running or accessible in sandbox, it MUST return 503
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["database"] == "disconnected"
        assert "detail" in data
