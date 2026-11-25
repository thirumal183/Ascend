"""Authentication and Session Management API Endpoints."""

from __future__ import annotations

import asyncio
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_client_info, get_current_user, get_db
from app.core.config import settings
from app.core.exceptions import AccessForbiddenException, AuthenticationException
from app.core.rate_limit import rate_limit
from app.core.security import hash_refresh_token, verify_password
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
    VerifyPasswordRequest,
    VerifyPasswordResponse,
)
from app.services.auth_service import AuthService

router = APIRouter()

REFRESH_COOKIE_NAME = "ascend_refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def _cookie_security_params() -> dict:
    is_prod = settings.ENVIRONMENT.lower() != "development"
    return {
        "httponly": True,
        "secure": is_prod,
        "samesite": "lax",
        "path": REFRESH_COOKIE_PATH,
    }


def _set_refresh_cookie(response: Response, raw_refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        **_cookie_security_params(),
    )


def _clear_refresh_cookie(response: Response) -> None:
    params = _cookie_security_params()
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=params["path"],
        secure=params["secure"],
        samesite=params["samesite"],
    )


def _resolve_refresh_token(request: Request, body_token: Optional[str]) -> Optional[str]:
    if body_token:
        return body_token
    cookie_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if cookie_token:
        # CSRF protection: require custom non-simple header (X-Requested-With or Bearer Authorization)
        if not request.headers.get("x-requested-with") and not request.headers.get("authorization"):
            raise AccessForbiddenException(
                "Missing CSRF protection header (X-Requested-With) for cookie-based session operation."
            )
        return cookie_token
    return None


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
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RegisterResponse:
    """Creates a new user, profile, baseline nutrition targets, and sets HttpOnly refresh cookie."""
    client_info = get_client_info(request)
    result = await AuthService.register_user(db=db, payload=payload, client_info=client_info)
    _set_refresh_cookie(response, result.tokens.refreshToken)
    return result


@router.post(
    "/token",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit("auth_login", max_requests=10, window_seconds=60))],
    summary="Authenticate user and issue tokens (OAuth2 / JSON)",
)
async def login_for_token(
    request: Request,
    response: Response,
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
        tokens = await AuthService.authenticate_user(
            db=db,
            username=str(username),
            password=str(password),
            client_info=client_info,
        )
        _set_refresh_cookie(response, tokens.refreshToken)
        return tokens
    else:
        try:
            body = await request.json()
            login_data = LoginRequest(**body)
        except Exception:
            raise AuthenticationException("Invalid request body for authentication.")

        tokens = await AuthService.authenticate_user(
            db=db,
            username=login_data.username,
            password=login_data.password,
            client_info=client_info,
        )
        _set_refresh_cookie(response, tokens.refreshToken)
        return tokens


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
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Authenticates credentials from JSON payload, issues access token, and sets HttpOnly refresh cookie."""
    client_info = get_client_info(request)
    tokens = await AuthService.authenticate_user(
        db=db,
        username=payload.username,
        password=payload.password,
        client_info=client_info,
    )
    _set_refresh_cookie(response, tokens.refreshToken)
    return tokens


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit("auth_refresh", max_requests=20, window_seconds=60))],
    summary="Rotate refresh token and issue new token pair",
)
async def refresh_token(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    payload: Optional[TokenRefreshRequest] = None,
) -> TokenResponse:
    """Rotates refresh token from HttpOnly cookie or JSON body. Detects reuse attacks."""
    raw_token = _resolve_refresh_token(request, payload.refreshToken if payload else None)
    if not raw_token:
        raise AuthenticationException("Refresh token missing.")
    client_info = get_client_info(request)
    tokens = await AuthService.rotate_refresh_token(
        db=db,
        raw_refresh_token=raw_token,
        client_info=client_info,
    )
    _set_refresh_cookie(response, tokens.refreshToken)
    return tokens


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Revoke refresh session or perform global logout",
)
async def logout(
    request: Request,
    response: Response,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    payload: Optional[LogoutRequest] = None,
) -> dict[str, str]:
    """Revokes the current device's refresh token (cookie or body), or invalidates all sessions globally."""
    raw_token = None if (payload and payload.logoutAll) else _resolve_refresh_token(
        request, payload.refreshToken if payload else None
    )
    await AuthService.logout(db=db, user=current_user, raw_refresh_token=raw_token)
    _clear_refresh_cookie(response)
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


@router.post(
    "/verify-password",
    response_model=VerifyPasswordResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit("auth_verify_password", max_requests=10, window_seconds=60))],
    summary="Re-verify current account password before sensitive changes",
)
async def verify_current_password(
    payload: VerifyPasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> VerifyPasswordResponse:
    """Verifies the authenticated user's current password via Argon2id."""
    is_valid = await asyncio.to_thread(verify_password, payload.password, current_user.password_hash)
    if not is_valid:
        raise AuthenticationException("Current password is incorrect.")
    return VerifyPasswordResponse(verified=True)
