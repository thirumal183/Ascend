"""ASCEND Application Configuration Management.

Parses environment variables and provides strictly validated settings
via Pydantic Settings.
"""

from pathlib import Path
from typing import Annotated, Any
from urllib.parse import quote_plus
from pydantic import (
    AnyHttpUrl,
    BeforeValidator,
    Field,
    PostgresDsn,
    computed_field,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine absolute path to backend/.env regardless of current working directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = BACKEND_DIR / ".env"


def parse_cors_origins(v: Any) -> list[str]:
    """Parse CORS origins whether supplied as JSON list, comma-delimited string, or Python list."""
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",") if i.strip()]
    elif isinstance(v, list):
        return [str(i) for i in v]
    elif isinstance(v, str) and v.startswith("["):
        import json

        try:
            parsed = json.loads(v)
            return [str(i) for i in parsed]
        except Exception:
            return ["http://localhost:3000", "http://127.0.0.1:3000"]
    return ["http://localhost:3000", "http://127.0.0.1:3000"]


class Settings(BaseSettings):
    """Core application settings with environment variable bindings."""

    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application Meta
    PROJECT_NAME: str = "ASCEND Nutrition & Fitness Platform"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", description="development | staging | production")
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # PostgreSQL Connection Parameters
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "ascend_db"

    # Optional explicit connection URI (overrides individual components if provided)
    DATABASE_URL: str | None = None

    # Connection Pool Settings
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_PRE_PING: bool = True

    # Security & Tokens
    RATE_LIMIT_ENABLED: bool = True
    DEV_INSECURE_SECRET_KEY: str = "development-only-insecure-secret-key-replace-in-production-09823487"
    SECRET_KEY: str = Field(
        default="development-only-insecure-secret-key-replace-in-production-09823487",
        description="256-bit cryptographically secure key for JWT encoding",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        """Reject insecure default or short SECRET_KEY outside local development."""
        if self.ENVIRONMENT.lower() != "development":
            if self.SECRET_KEY == self.DEV_INSECURE_SECRET_KEY or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "SECRET_KEY must be overridden with a cryptographically random >=32-char value "
                    "when ENVIRONMENT is not 'development'."
                )
        return self

    # CORS Allowed Origins
    BACKEND_CORS_ORIGINS: Annotated[
        list[str],
        BeforeValidator(parse_cors_origins),
    ] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # AI & Gemini API Configuration
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    AI_REQUEST_TIMEOUT_SECONDS: float = 10.0

    @computed_field  # type: ignore[prop-decorator]
    @property
    def async_database_uri(self) -> str:
        """Constructs an asyncpg PostgreSQL connection URI with URL-encoded credentials."""
        if self.DATABASE_URL:
            # Ensure asyncpg driver is specified
            url = self.DATABASE_URL
            if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
                return url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url

        user = quote_plus(self.POSTGRES_USER)
        password = quote_plus(self.POSTGRES_PASSWORD)
        return (
            f"postgresql+asyncpg://{user}:{password}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def sync_database_uri(self) -> str:
        """Constructs a synchronous connection URI with URL-encoded credentials (used by Alembic)."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgresql+asyncpg://"):
                return url.replace("postgresql+asyncpg://", "postgresql://", 1)
            return url

        user = quote_plus(self.POSTGRES_USER)
        password = quote_plus(self.POSTGRES_PASSWORD)
        return (
            f"postgresql://{user}:{password}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()
