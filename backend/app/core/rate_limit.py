"""Lightweight In-Memory Sliding-Window Rate Limiter.

Provides brute-force and abuse protection for authentication, AI, and search endpoints
without requiring external Redis infrastructure.
"""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from typing import Callable, Deque, Dict

from fastapi import Request

from app.core.config import settings
from app.core.exceptions import AscendException


class RateLimitExceededException(AscendException):
    """Raised when a client exceeds the configured request window."""

    def __init__(self, retry_after: int = 60):
        super().__init__(
            message=f"Rate limit exceeded. Please retry after {retry_after} seconds.",
            code="RATE_LIMITED",
            details={"retryAfterSeconds": retry_after},
        )


class SlidingWindowLimiter:
    """Thread/async-safe per-key sliding-window counter."""

    def __init__(self) -> None:
        self._buckets: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(self, key: str, max_requests: int, window_seconds: int) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return

        now = time.monotonic()
        cutoff = now - window_seconds

        async with self._lock:
            bucket = self._buckets[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= max_requests:
                retry_after = max(1, int(window_seconds - (now - bucket[0])) + 1)
                raise RateLimitExceededException(retry_after=retry_after)

            bucket.append(now)

    async def reset(self) -> None:
        async with self._lock:
            self._buckets.clear()


rate_limiter = SlidingWindowLimiter()


def rate_limit(scope: str, max_requests: int, window_seconds: int = 60) -> Callable:
    """FastAPI dependency factory enforcing a per-IP sliding window limit."""

    async def _dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"{scope}:{client_ip}"
        await rate_limiter.check(key=key, max_requests=max_requests, window_seconds=window_seconds)

    return _dependency
