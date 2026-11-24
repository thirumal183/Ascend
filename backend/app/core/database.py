"""SQLAlchemy 2.0 Asynchronous Database Engine & Session Management.

Provides connection pooling via asyncpg, transaction lifecycle hooks,
dependency injection generators, and database connectivity probes.
"""

import asyncio
import time
from collections.abc import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings

# Initialize asynchronous engine
# PostgreSQL connection pool configuration with fast connection timeout
engine: AsyncEngine = create_async_engine(
    settings.async_database_uri,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=settings.DATABASE_POOL_PRE_PING,
    echo=settings.DEBUG and settings.ENVIRONMENT == "development",
    connect_args={"timeout": 3.0, "command_timeout": 3.0},
)

# Asynchronous session factory
async_session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Dependency providing a transactional AsyncSession.

    Yields a scoped session, commits the transaction if no exception occurs,
    rolls back on unhandled exceptions, and deterministically closes the session.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_connection() -> tuple[bool, float | None, str | None]:
    """Executes a lightweight 'SELECT 1' query to verify PostgreSQL readiness.

    Returns:
        tuple[bool, float | None, str | None]:
            (is_connected, latency_in_ms, error_detail_if_any)
    """
    start_time = time.perf_counter()
    try:
        async def _probe():
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))

        # Fast timeout probe (max 3 seconds)
        await asyncio.wait_for(_probe(), timeout=3.0)
        latency_ms = (time.perf_counter() - start_time) * 1000
        return True, round(latency_ms, 2), None
    except Exception as exc:
        return False, None, str(exc)


async def dispose_engine() -> None:
    """Closes all active database connections in the pool during application shutdown."""
    await engine.dispose()
