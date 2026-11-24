"""Authentication and Session Management API Endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Header, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_client_info, get_current_user, get_db
from app.core.exceptions import AuthenticationException
from app.core.rate_limit import rate_limit
from app.core.security import hash_refresh_token
from app.models.user import User
from app.schemas.auth import (
    AuthMeResponse,
    LoginRequest,
    LogoutRequest,
    RegisterResponse,
    SessionListResponse,
    TokenRefreshRequest,
    TokenResponse,
    UserRegisterRequest,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("auth_register", max_requests=10, window_seconds=60))],
    summary="Register new user account",
)
async def register(
    payload: UserRegisterRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RegisterResponse:
    """Creates a new user, profile, baseline nutrition targets, and returns initial tokens."""
    client_info = get_client_info(request)
    return await AuthService.register_user(db=db, payload=payload, client_info=client_info)


@router.post(
    "/token",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit("auth_login", max_requests=10, window_seconds=60))],
    summary="Authenticate user and issue tokens (OAuth2 / JSON)",
)
async def login_for_token(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Authenticates credentials from either form-encoded OAuth2 request or JSON payload."""
    client_info = get_client_info(request)
    content_type = request.headers.get("content-type", "")

    if "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")
        if not username or not password:
            raise AuthenticationException("Username and password are required.")
        return await AuthService.authenticate_user(
            db=db,
            username=str(username),
            password=str(password),
            client_info=client_info,
        )
    else:
        try:
            body = await request.json()
            login_data = LoginRequest(**body)
        except Exception:
            raise AuthenticationException("Invalid request body for authentication.")

        return await AuthService.authenticate_user(
            db=db,
            username=login_data.username,
            password=login_data.password,
            client_info=client_info,
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit("auth_login", max_requests=10, window_seconds=60))],
    summary="Authenticate user (JSON login endpoint)",
)
async def login(
    payload: LoginRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Authenticates credentials from JSON payload and returns access + refresh tokens."""
    client_info = get_client_info(request)
    return await AuthService.authenticate_user(
        db=db,
        username=payload.username,
        password=payload.password,
        client_info=client_info,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit("auth_refresh", max_requests=20, window_seconds=60))],
    summary="Rotate refresh token and issue new token pair",
)
async def refresh_token(
    payload: TokenRefreshRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Rotates refresh token. Detects reuse/replay attacks and invalidates all user sessions if triggered."""
    client_info = get_client_info(request)
    return await AuthService.rotate_refresh_token(
        db=db,
        raw_refresh_token=payload.refreshToken,
        client_info=client_info,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Revoke refresh session or perform global logout",
)
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    payload: Optional[LogoutRequest] = None,
) -> dict[str, str]:
    """Revokes the current device's refresh token, or invalidates all sessions globally if token is omitted."""
    raw_token = payload.refreshToken if payload else None
    await AuthService.logout(db=db, user=current_user, raw_refresh_token=raw_token)
    return {"message": "Successfully logged out."}


@router.get(
    "/sessions",
    response_model=SessionListResponse,
    status_code=status.HTTP_200_OK,
    summary="List active device sessions",
)
async def list_active_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Annotated[Optional[str], Header()] = None,
) -> SessionListResponse:
    """Returns all active, non-expired device sessions for the authenticated user."""
    return await AuthService.list_sessions(db=db, user_id=current_user.id)


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke a specific device session",
)
async def revoke_device_session(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Terminates and revokes a specific device session."""
    await AuthService.revoke_session(db=db, user_id=current_user.id, session_id=session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/me",
    response_model=AuthMeResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve current authenticated user state",
)
async def get_current_user_state(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthMeResponse:
    """Returns composite account, profile, and nutrition goals for the authenticated user."""
    return await AuthService.get_me(db=db, user_id=current_user.id)
