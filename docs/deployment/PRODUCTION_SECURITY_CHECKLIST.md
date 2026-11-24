# ASCEND — Production Security Checklist

## 1. Mandatory Pre-Launch Controls (Verified / Enforced)
- [x] `ENVIRONMENT="production"` and `DEBUG=False` enforced by Pydantic `@model_validator` (`backend/app/core/config.py`).
- [x] `SECRET_KEY` validated as `>= 32` chars and non-default at startup.
- [x] `GEMINI_API_KEY` held exclusively server-side and transmitted via `x-goog-api-key` header (never URL query string or `VITE_*`).
- [x] Argon2id password hashing (`time_cost=3, memory_cost=65536, parallelism=4`) offloaded via `asyncio.to_thread`, with `max_length=128`.
- [x] Refresh token rotation with `SELECT ... FOR UPDATE` row locking, SHA-256 hash storage, and full-account revocation on reuse detection.
- [x] Fail-closed `jwt_version` validation on every protected endpoint (`backend/app/api/v1/deps.py`).
- [x] Multi-tenant ownership enforced across Custom Foods, Meal Intake, Workout Plans, Workout Sessions, Progress Biometrics, and AI Conversations.
- [x] Rate limiting enabled (`RATE_LIMIT_ENABLED=True`) on `/auth/*`, `/ai/chat`, `/foods/search` + 1 MiB `MAX_REQUEST_BODY_BYTES` guard.
- [x] Explicit CORS origin, method, and header allowlists (`BACKEND_CORS_ORIGINS` set to exact production frontend origin).
- [x] Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`) + CSP `<meta>` allowing HTTPS `connect-src`.
- [x] `npm audit` = 0 vulnerabilities.

## 2. Refresh Token Storage (`localStorage` vs `HttpOnly` Cookies) — Architectural Evaluation
- **Current State:** Access and refresh tokens are stored in `localStorage` and exchanged via JSON Bearer payloads (`src/services/api/client.ts`). This is protected against common XSS via React JSX escaping, zero `dangerouslySetInnerHTML`/`eval` sinks, and strict CSP.
- **Recommended Post-MVP Hardening (Requires API Contract Change Approval):**
  1. Set `refresh_token` in an `HttpOnly; Secure; SameSite=None` (required for cross-origin `pages.dev` -> `onrender.com`) cookie on `/auth/login`, `/auth/register`, and `/auth/refresh`.
  2. Keep `accessToken` strictly in React memory (never `localStorage`), recovering sessions via `/auth/refresh` on page load.
  3. Require a CSRF custom header (e.g. `X-Requested-With: XMLHttpRequest`) or double-submit CSRF token on `/auth/refresh` and `/auth/logout` when using `SameSite=None` cookies.
  4. Clear the `HttpOnly` cookie on `/auth/logout`.
