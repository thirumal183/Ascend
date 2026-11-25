"""FastAPI Dependency Injection Providers."""

from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AuthenticationException
from app.core.security import decode_access_token
from app.models.user import User

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/token",
    auto_error=False,
)


from app.core.rate_limit import resolve_client_ip


def get_client_info(request: Request) -> dict[str, str]:
    """Extracts client IP address and User-Agent telemetry."""
    ip = resolve_client_ip(request)
    if ip == "unknown":
        ip = "127.0.0.1"
    ua = request.headers.get("user-agent", "Unknown Client")
    return {"ip_address": ip, "device_info": ua}


async def get_current_user(
    token: Annotated[Optional[str], Depends(reusable_oauth2)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Validates the Bearer JWT access token and returns the current user."""
    if not token:
        raise AuthenticationException("Not authenticated.")

    payload = decode_access_token(token)
    user_id_str = payload.get("sub")
    token_jwt_version = payload.get("jwt_version")

    if not user_id_str:
        raise AuthenticationException("Invalid token payload: missing subject.")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise AuthenticationException("Invalid token subject format.")

    user = await db.get(User, user_id)
    if not user:
        raise AuthenticationException("User account not found.")

    if not user.is_active:
        raise AuthenticationException("User account is inactive.")

    if token_jwt_version is None or not isinstance(token_jwt_version, int) or user.jwt_version != token_jwt_version:
        raise AuthenticationException("Token has been invalidated by a session revocation epoch.")

    return user


async def get_optional_current_user(
    token: Annotated[Optional[str], Depends(reusable_oauth2)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Optional[User]:
    """Returns the authenticated user if Bearer token is provided, or None for public requests."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        token_jwt_version = payload.get("jwt_version")
        if not user_id_str:
            return None
        user_id = uuid.UUID(user_id_str)
        user = await db.get(User, user_id)
        if not user or not user.is_active:
            return None
        if token_jwt_version is None or not isinstance(token_jwt_version, int) or user.jwt_version != token_jwt_version:
            return None
        return user
    except Exception:
        return None


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Ensures the authenticated user is active."""
    if not current_user.is_active:
        raise AuthenticationException("User account is inactive.")
    return current_user


__all__ = [
    "get_db",
    "get_client_info",
    "get_current_user",
    "get_optional_current_user",
    "get_current_active_user",
]
