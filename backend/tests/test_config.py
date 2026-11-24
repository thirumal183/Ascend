"""Unit tests for Pydantic application configuration."""

import pytest
from app.core.config import Settings, parse_cors_origins


def test_default_settings():
    """Verifies that default settings load with expected values."""
    settings = Settings()
    assert settings.PROJECT_NAME == "ASCEND Nutrition & Fitness Platform"
    assert settings.VERSION == "1.0.0"
    assert settings.API_V1_STR == "/api/v1"
    assert settings.POSTGRES_PORT == 5432
    assert "localhost" in settings.async_database_uri
    assert "postgresql+asyncpg://" in settings.async_database_uri
    assert "postgresql://" in settings.sync_database_uri
    assert not settings.sync_database_uri.startswith("postgresql+asyncpg://")
    assert settings.GEMINI_MODEL == "gemini-2.5-flash"
    assert settings.GEMINI_API_KEY is None


def test_database_uri_explicit_override():
    """Verifies that explicit DATABASE_URL is correctly parsed and adjusted for asyncpg."""
    custom_url = "postgresql://custom_user:custom_pass@db.internal:5433/custom_db"
    settings = Settings(DATABASE_URL=custom_url)
    assert settings.async_database_uri == "postgresql+asyncpg://custom_user:custom_pass@db.internal:5433/custom_db"
    assert settings.sync_database_uri == custom_url


def test_cors_origins_parsing():
    """Verifies that CORS origins parser supports multiple input representations."""
    # List of strings
    assert parse_cors_origins(["http://localhost:3000"]) == ["http://localhost:3000"]

    # Comma-delimited string
    assert parse_cors_origins("http://localhost:3000, http://127.0.0.1:3000") == [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # JSON formatted string
    assert parse_cors_origins('["http://example.com", "http://app.ascend.io"]') == [
        "http://example.com",
        "http://app.ascend.io",
    ]

    # Empty or fallback
    assert len(parse_cors_origins(None)) >= 2


def test_production_secret_key_validator():
    """AUD-P1-08: Non-development environments must reject default or short SECRET_KEY."""
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(_env_file=None, ENVIRONMENT="production")

    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(_env_file=None, ENVIRONMENT="staging", SECRET_KEY="short-key")

    prod_settings = Settings(
        _env_file=None,
        ENVIRONMENT="production",
        SECRET_KEY="a-very-strong-random-production-secret-key-at-least-32-chars",
    )
    assert prod_settings.ENVIRONMENT == "production"
