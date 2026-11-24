"""Custom Application Exception Hierarchy.

Provides structured domain error types for consistent HTTP response mapping.
"""

from typing import Any


class AscendException(Exception):
    """Base class for all application-level exceptions."""

    def __init__(self, message: str, code: str = "INTERNAL_ERROR", details: Any = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details


class EntityNotFoundException(AscendException):
    """Raised when an entity requested by ID does not exist."""

    def __init__(self, message: str = "Requested resource not found.", details: Any = None):
        super().__init__(message=message, code="ENTITY_NOT_FOUND", details=details)


class AccessForbiddenException(AscendException):
    """Raised when an authenticated user attempts to access another tenant's resource."""

    def __init__(self, message: str = "Permission denied for this resource.", details: Any = None):
        super().__init__(message=message, code="FORBIDDEN", details=details)


class DuplicateEntityException(AscendException):
    """Raised on unique constraint collisions (e.g. duplicate email)."""

    def __init__(self, message: str = "Resource already exists with this identifier.", details: Any = None):
        super().__init__(message=message, code="CONFLICT", details=details)


class DatabaseConnectionException(AscendException):
    """Raised when database readiness or connectivity check fails."""

    def __init__(self, message: str = "Database connection unavailable.", details: Any = None):
        super().__init__(message=message, code="DATABASE_UNAVAILABLE", details=details)


class AuthenticationException(AscendException):
    """Raised when authentication credentials or token validation fails."""

    def __init__(self, message: str = "Authentication failed.", details: Any = None):
        super().__init__(message=message, code="UNAUTHORIZED", details=details)


class TokenExpiredException(AscendException):
    """Raised when an access or refresh token has expired."""

    def __init__(self, message: str = "Token has expired.", details: Any = None):
        super().__init__(message=message, code="TOKEN_EXPIRED", details=details)


class TokenReuseDetectedException(AscendException):
    """Raised when an already-rotated refresh token is presented (replay / theft attack)."""

    def __init__(self, message: str = "Token reuse detected. All active sessions have been revoked.", details: Any = None):
        super().__init__(message=message, code="REUSE_DETECTED", details=details)


class ValidationException(AscendException):
    """Raised when domain-level business validation fails (HTTP 422)."""

    def __init__(self, message: str = "Validation failed.", details: Any = None):
        super().__init__(message=message, code="VALIDATION_ERROR", details=details)
