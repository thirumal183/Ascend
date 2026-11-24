"""ASCEND FastAPI Application Factory & Main Entrypoint.

Initializes middleware, lifespan connection lifecycle, global exception handling,
and API route registration.
"""

from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import dispose_engine
from app.core.exceptions import AscendException

logger = logging.getLogger("ascend.app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager handling startup and teardown tasks."""
    # Startup: Engine initialization happens on first connection
    yield
    # Shutdown: Dispose of the database engine pool cleanly
    await dispose_engine()


def create_application() -> FastAPI:
    """Application factory configuring middleware and routes."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
        docs_url=f"{settings.API_V1_STR}/docs" if settings.DEBUG else None,
        redoc_url=f"{settings.API_V1_STR}/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # Cross-Origin Resource Sharing (CORS) Configuration
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type", "Accept"],
        )

    # Browser Security Headers Middleware
    @app.middleware("http")
    async def security_headers_middleware(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        return response

    # Global Domain Exception Handler
    @app.exception_handler(AscendException)
    async def ascend_exception_handler(request, exc: AscendException):
        status_map = {
            "ENTITY_NOT_FOUND": status.HTTP_404_NOT_FOUND,
            "FORBIDDEN": status.HTTP_403_FORBIDDEN,
            "CONFLICT": status.HTTP_409_CONFLICT,
            "DATABASE_UNAVAILABLE": status.HTTP_503_SERVICE_UNAVAILABLE,
            "UNAUTHORIZED": status.HTTP_401_UNAUTHORIZED,
            "REUSE_DETECTED": status.HTTP_401_UNAUTHORIZED,
            "TOKEN_EXPIRED": status.HTTP_401_UNAUTHORIZED,
            "VALIDATION_ERROR": status.HTTP_422_UNPROCESSABLE_CONTENT,
            "RATE_LIMITED": status.HTTP_429_TOO_MANY_REQUESTS,
        }
        http_status = status_map.get(exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        headers = {}
        if exc.code == "RATE_LIMITED" and isinstance(exc.details, dict) and "retryAfterSeconds" in exc.details:
            headers["Retry-After"] = str(exc.details["retryAfterSeconds"])
        return JSONResponse(
            status_code=http_status,
            headers=headers,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed.",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
        logger.error("Unhandled database error: %s", type(exc).__name__)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected database error occurred.",
                    "details": None,
                }
            },
        )

    # Root informational route
    @app.get("/", tags=["Root"])
    async def root_info():
        return {
            "project": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "api_v1": settings.API_V1_STR,
            "docs": f"{settings.API_V1_STR}/docs" if settings.DEBUG else "disabled",
        }

    # Mount API v1 Routers
    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app


app = create_application()
