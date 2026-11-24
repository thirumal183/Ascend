"""Cryptographic Security Utilities.

Implements Argon2id password hashing, SHA-256 token hashing, and JWT token lifecycle management
according to ASCEND Security Architecture Specification (Phase 3).
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import uuid

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
import jwt

from app.core.config import settings
from app.core.exceptions import AuthenticationException, TokenExpiredException

# Argon2id configuration matching Phase 3 SECURITY_DESIGN.md specifications
password_hasher = PasswordHasher(
    time_cost=3,        # 3 iterations
    memory_cost=65536,  # 64 MiB RAM usage
    parallelism=4,      # 4 concurrent threads
    hash_len=32,        # 256-bit output hash
    salt_len=16,        # 128-bit cryptographically secure random salt
)


def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id with unique CSPRNG salt."""
    return password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash with constant-time equality check."""
    try:
        return password_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError):
        return False


def hash_refresh_token(raw_token: str) -> str:
    """Computes SHA-256 cryptographic digest of an opaque refresh token for persistent storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_refresh_token() -> str:
    """Generates an opaque, high-entropy 256-bit URL-safe random string for refresh token."""
    return f"ascend_rt_{secrets.token_urlsafe(32)}"


def create_access_token(
    user_id: uuid.UUID | str,
    jwt_version: int,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Creates a signed HMAC-SHA256 stateless access token containing user identity and version epoch."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "jwt_version": jwt_version,
        "exp": expire,
        "iat": now,
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and cryptographically validates a JWT access token.

    Raises:
        TokenExpiredException: If token has passed its expiration time.
        AuthenticationException: If token signature or structure is invalid.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        if payload.get("type") != "access":
            raise AuthenticationException("Invalid token type.")
        return payload
    except jwt.ExpiredSignatureError:
        raise TokenExpiredException("Access token has expired.")
    except jwt.InvalidTokenError:
        raise AuthenticationException("Invalid or malformed access token.")
