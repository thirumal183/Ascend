"""Unit tests for database session lifecycle and transaction management."""

from unittest.mock import AsyncMock, patch
import pytest
from app.core.database import get_db, dispose_engine, engine
from app.core.exceptions import (
    AscendException,
    EntityNotFoundException,
    AccessForbiddenException,
)


class MockSessionContext:
    """Async context manager wrapper for mocking async_session_factory()."""

    def __init__(self, session: AsyncMock):
        self.session = session

    async def __aenter__(self):
        return self.session

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return None


@pytest.mark.asyncio
async def test_session_lifecycle_commit_on_success():
    """Verifies that the session commits upon clean completion."""
    mock_session = AsyncMock()

    with patch("app.core.database.async_session_factory", return_value=MockSessionContext(mock_session)):
        gen = get_db()
        session = await anext(gen)
        assert session == mock_session

        # Advance generator to simulate completion
        with pytest.raises(StopAsyncIteration):
            await anext(gen)

        mock_session.commit.assert_awaited_once()
        mock_session.rollback.assert_not_awaited()
        mock_session.close.assert_awaited_once()


@pytest.mark.asyncio
async def test_session_lifecycle_rollback_on_error():
    """Verifies that the session rolls back and closes when an unhandled exception is raised."""
    mock_session = AsyncMock()

    with patch("app.core.database.async_session_factory", return_value=MockSessionContext(mock_session)):
        gen = get_db()
        session = await anext(gen)
        assert session == mock_session

        # Throw exception into generator
        with pytest.raises(RuntimeError, match="Simulated application error"):
            await gen.athrow(RuntimeError("Simulated application error"))

        mock_session.rollback.assert_awaited_once()
        mock_session.commit.assert_not_awaited()
        mock_session.close.assert_awaited_once()


@pytest.mark.asyncio
async def test_engine_disposal():
    """Verifies that dispose_engine invokes engine.dispose."""
    with patch("app.core.database.engine", new_callable=AsyncMock) as mock_engine:
        await dispose_engine()
        mock_engine.dispose.assert_awaited_once()


def test_custom_exception_hierarchy():
    """Verifies domain exception codes and attributes."""
    exc1 = EntityNotFoundException("User not found.")
    assert exc1.code == "ENTITY_NOT_FOUND"
    assert exc1.message == "User not found."

    exc2 = AccessForbiddenException("Forbidden action.")
    assert exc2.code == "FORBIDDEN"
    assert isinstance(exc2, AscendException)
