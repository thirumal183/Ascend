"""Tests for database migrations and schema metadata integrity."""

import pytest
from sqlalchemy import inspect
from app.core.database import engine
from app.db.base import Base
import app.models  # noqa: F401


@pytest.mark.asyncio
async def test_all_15_entities_exist_in_metadata():
    """Confirms that Base.metadata defines exactly the 15 approved domain tables."""
    expected_tables = {
        # Domain 1 (4)
        "users",
        "user_refresh_sessions",
        "user_profiles",
        "nutrition_goals",
        # Domain 2 (4)
        "nutrients",
        "food_items",
        "food_nutrients",
        "intake_records",
        # Domain 3 (4)
        "workout_plans",
        "exercise_items",
        "workout_sessions",
        "exercise_set_logs",
        # Domain 4 (1)
        "progress_records",
        # Domain 5 (2)
        "chat_conversations",
        "chat_messages",
    }
    actual_tables = set(Base.metadata.tables.keys())
    assert actual_tables == expected_tables, f"Mismatch: {actual_tables ^ expected_tables}"
    assert len(actual_tables) == 15


@pytest.mark.asyncio
async def test_live_database_tables_exist():
    """Inspects the live PostgreSQL database and asserts that all 15 tables and Alembic version exist."""
    async with engine.connect() as conn:
        def _get_tables(sync_conn):
            inspector = inspect(sync_conn)
            return set(inspector.get_table_names())

        db_tables = await conn.run_sync(_get_tables)

        expected_domain_tables = {
            "users",
            "user_refresh_sessions",
            "user_profiles",
            "nutrition_goals",
            "nutrients",
            "food_items",
            "food_nutrients",
            "intake_records",
            "workout_plans",
            "exercise_items",
            "workout_sessions",
            "exercise_set_logs",
            "progress_records",
            "chat_conversations",
            "chat_messages",
        }

        assert expected_domain_tables.issubset(db_tables), (
            f"Missing tables in PostgreSQL: {expected_domain_tables - db_tables}"
        )
        assert "alembic_version" in db_tables
