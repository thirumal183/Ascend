"""Pytest Global Test Fixtures and Async Client Setup."""

import sys
from pathlib import Path
from collections.abc import AsyncGenerator
import pytest
from httpx import ASGITransport, AsyncClient

# Ensure backend root is on sys.path for test execution
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.main import app
from app.core.config import settings
from app.core.database import engine
from app.core.rate_limit import rate_limiter

# Disable rate limiting across general test suite; dedicated rate-limit tests re-enable explicitly
settings.RATE_LIMIT_ENABLED = False


@pytest.fixture(autouse=True)
async def cleanup_database_pool() -> AsyncGenerator[None, None]:
    """Ensures pooled database connections do not cross pytest event-loop boundaries."""
    yield
    await rate_limiter.reset()
    await engine.dispose()


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Provides an asynchronous HTTP test client bound to the FastAPI application."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
