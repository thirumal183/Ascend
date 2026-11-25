# ASCEND — Phase 6.5.1 Final Verification Report

**Date:** 2026-11-25  
**Branch:** `main` (uncommitted Phase 6.5 working tree; zero commits/pushes made)  
**Database Revision:** `d4e5f6a7b8c9 (head)`  
**Final Verdict:** **READY WITH CONDITIONS**

---

## 1. Executive Summary

Phase 6.5.1 performed a targeted verification of the completed Phase 6.5 implementation across four areas: (1) production cross-origin authentication & cookie lifecycle, (2) local development hostname/cookie behavior, (3) Swagger/OpenAPI documentation routing, and (4) PostgreSQL migration & schema integrity, alongside a full rerun of all automated regression suites on the final working tree.

No code defects requiring source edits were discovered during Phase 6.5.1. All automated suites pass (`56/56` pytest, `44/44` Batch 7, `22/22` Batch 8 Security, `33/33` Batch 8 Pathways, `0` TypeScript lint errors, clean Vite production build, `0` npm vulnerabilities). The verdict is **READY WITH CONDITIONS** because:
1. Deploying across separate Public Suffix List domains (`*.pages.dev` + `*.onrender.com`) makes `ascend_refresh_token` a third-party cookie, which Safari ITP, Firefox ETP Strict, Brave, and Chrome Incognito block (breaking page-reload recovery and silent refresh unless a same-site custom domain or same-origin `/api` proxy is used).
2. Live browser E2E authentication lifecycle verification remains deferred to Phase 8 post-deployment.

---

## 2. Production Cross-Origin Authentication Audit

### 2.1 Lifecycle Verification (Source-Level)
1. **Registration & Login (`backend/app/api/v1/endpoints/auth.py:78-168`, `src/services/api/authApi.ts:103-121`):**
   - `/register`, `/token`, and `/login` return `accessToken` in JSON and set `ascend_refresh_token` via `_set_refresh_cookie`.
2. **In-Memory Access Token (`src/services/api/client.ts:28-83`):**
   - `inMemoryAccessToken` lives strictly in module memory. `getStoredRefreshToken()` returns `null` when `isBrowserRuntime` (`typeof window !== 'undefined' && typeof document !== 'undefined'`) is `true`. `setStoredTokens()` writes only `ascend_has_live_session = '1'` to `localStorage` and actively deletes legacy `ascend_access_token` and `ascend_refresh_token` keys.
3. **HttpOnly Cookie Attributes (`backend/app/api/v1/endpoints/auth.py:31-61`):**
   - Production (`ENVIRONMENT.lower() != "development"`): `httponly=True`, `secure=True`, `samesite="none"`, `path="/api/v1/auth"`, `max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400`.
   - `_clear_refresh_cookie` uses identical `key`, `path`, `secure`, and `samesite` attributes on `/logout`.
4. **Session Recovery (`src/App.tsx:297-325`):**
   - `recoverLiveSession` checks `hasLiveSessionHint()`, calls `authApi.refresh()` (`credentials: 'include'`, `X-Requested-With: XMLHttpRequest`), and hydrates `/auth/me` + domain data. (`src/main.tsx` does not enable `<StrictMode>`, avoiding double-mount refresh races in dev.)
5. **Access-Token Refresh & Concurrency (`src/services/api/client.ts:94-223`, `backend/app/services/auth_service.py`):**
   - `apiClient` and `executeTokenRefresh` both pass `credentials: 'include'` and `X-Requested-With: XMLHttpRequest`.
   - Concurrent `401` responses share a single `isRefreshing` / `refreshQueue` pipeline; backend `AuthService.rotate_refresh_token` locks the `UserRefreshSession` row with `FOR UPDATE`.
6. **Logout & Reuse Detection (`src/App.tsx:423-438`, `backend/app/api/v1/endpoints/auth.py:197-215`):**
   - `handleSignOut` calls `authApi.logout(rt ?? undefined)` whenever `userAccount.isAuthenticated && !userAccount.isDemoAccount`, revoking the server session and clearing the cookie even when `rt` is `null` in browser mode.
   - `LogoutRequest.logoutAll` supports explicit multi-device invalidation (`jwt_version` bump).
7. **CORS & CSRF (`backend/app/main.py:44-51`, `backend/app/api/v1/endpoints/auth.py:64-75`):**
   - CORS uses explicit `BACKEND_CORS_ORIGINS` (no wildcard `*`) with `allow_credentials=True` and `allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"]`.
   - `_resolve_refresh_token` rejects cookie-authenticated calls missing both `X-Requested-With` and `Authorization` with `403 FORBIDDEN`.

### 2.2 Cloudflare Pages + Render Third-Party Cookie Impact
- **Issue:** `*.pages.dev` and `*.onrender.com` are on the Public Suffix List, so browsers classify them as **cross-site** (`third-party`).
- **Impact:** Even with `SameSite=None; Secure`, Safari (ITP), Firefox (ETP Strict), Brave, and Chrome Incognito block third-party cookies. Initial login succeeds (via JSON `accessToken`), but **page reload (`recoverLiveSession`) and silent `/auth/refresh` after 30 minutes fail** on those browsers.
- **Recommended Production Configuration:** Configure a **same-site custom domain** (e.g. Cloudflare Pages on `app.<yourdomain>` and Render on `api.<yourdomain>`, or proxy `/api/*` via a Cloudflare Pages Function on the same origin) so `ascend_refresh_token` is a **first-party cookie**.

---

## 3. Local Development Authentication Audit (`localhost:3000` vs `127.0.0.1:8000`)

- **Root Cause of Hostname Mismatch:** Under RFC 6265 and browser SameSite rules, `localhost` and `127.0.0.1` are treated as **cross-site** hostnames.
- **Cookie Impact:** In `development`, `_cookie_security_params()` sets `SameSite=Lax; Secure=False`. A `SameSite=Lax` cookie issued by `http://127.0.0.1:8000` is **NOT** attached by browsers on cross-site `POST fetch(..., { credentials: 'include' })` requests from `http://localhost:3000` (nor vice versa).
- **CORS & Client Defaults:** `src/services/api/client.ts:35` defaults `API_BASE_URL` to `http://localhost:8000/api/v1`, and `backend/app/core/config.py:107-110` allows `http://localhost:3000` and `http://127.0.0.1:3000`.
- **Safest Consistent Local Startup:** Match hostnames on both frontend and backend:
  - **Option A (`localhost` everywhere — matches `client.ts` default):**
    - Backend: `python -m uvicorn app.main:create_application --factory --host localhost --port 8000` (or `--host 0.0.0.0 --port 8000` so both IPv4 `127.0.0.1` and IPv6 `::1` `localhost` work on Windows)
    - Frontend: `npm.cmd run dev` on `http://localhost:3000` with default `VITE_API_BASE_URL=http://localhost:8000/api/v1`
  - **Option B (`127.0.0.1` everywhere):**
    - Backend: `python -m uvicorn app.main:create_application --factory --host 127.0.0.1 --port 8000`
    - Frontend: `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1` and open `http://127.0.0.1:3000` in the browser.

*(Note: Live browser cookie behavior was analyzed from source and HTTP specifications; actual browser E2E testing is deferred to Phase 8.)*

---

## 4. Swagger / OpenAPI Documentation Route Investigation

- **Why `/docs` returned `404 {"detail":"Not Found"}`:**
  In `backend/app/main.py:37-39`, FastAPI mounts OpenAPI under `settings.API_V1_STR` (`/api/v1`) when `settings.DEBUG` is `True`:
  - `openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None`
  - `docs_url=f"{settings.API_V1_STR}/docs" if settings.DEBUG else None`
  - `redoc_url=f"{settings.API_V1_STR}/redoc" if settings.DEBUG else None`
- **Production Policy:** `Settings.validate_production_security` (`backend/app/core/config.py:99-100`) enforces `DEBUG=False` when `ENVIRONMENT == "production"`, automatically disabling `/api/v1/docs`, `/api/v1/redoc`, and `/api/v1/openapi.json` in production.
- **Live Verification (`http://127.0.0.1:8001`):**
  - `GET /` → `200` (136 bytes, reports `"docs": "/api/v1/docs"`)
  - `GET /api/v1/health` → `200` (151 bytes)
  - `GET /docs` → `404` (`{"detail":"Not Found"}`)
  - `GET /api/v1/docs` → `200` (1041 bytes, Swagger UI HTML)
  - `GET /api/v1/openapi.json` → `200` (88302 bytes)
- **Conclusion:** Documentation is intentionally mounted at **`/api/v1/docs`** in development and disabled in production; no code change was required.

---

## 5. Migration & Database Integrity (`d4e5f6a7b8c9`)

- **Revisions:** Single linear history `<base> -> 254b250445d3 -> 9c4f8a2b1d7e -> d4e5f6a7b8c9 (head)`. `python -m alembic current` and `python -m alembic heads` both report `d4e5f6a7b8c9 (head)`. No duplicate or conflicting branches exist.
- **Live PostgreSQL Inspection (`ascend_db`):**
  - `water_intake_records`: FK `water_intake_records_user_id_fkey` (`user_id -> users.id`, `ON DELETE CASCADE`), index `idx_water_intake_user_date` on `(user_id, date_logged DESC)`, check constraint `ck_water_amount_range` (`amount_ml > 0 AND amount_ml <= 5000`).
  - `exercise_items`: nullable `created_by_user_id` FK `fk_exercise_items_created_by_user_id` (`created_by_user_id -> users.id`, `ON DELETE CASCADE`), index `ix_exercise_items_created_by_user_id`, existing check constraints `ck_exercise_rest` and `ck_exercise_sets` preserved.
  - Existing Phase 6 data preserved; `ascend_db` was not reset or dropped.

---

## 6. Automated Verification Results (Final Working Tree)

| Check | Exact Command | Result | Scope |
| --- | --- | --- | --- |
| Batch 7 Integration | `$env:VITE_API_BASE_URL = 'http://127.0.0.1:8001/api/v1'; npx.cmd tsx scripts/test_batch7_integration.ts` | **44/44 PASSED** | Automated Node `tsx` client against live Uvicorn on `:8001` |
| Batch 8 Security Audit | `npx.cmd tsx scripts/test_batch8_security_audit.ts` | **22/22 PASSED** | Automated Node `tsx` client against live Uvicorn on `:8001` |
| Batch 8 Multi-Pathway | `npx.cmd tsx scripts/test_batch8_pathways.ts` | **33/33 PASSED** | Automated Node `tsx` client against live Uvicorn on `:8001` |
| Backend Pytest Suite | `Set-Location backend; python -m pytest tests -v` | **56/56 PASSED** (6.77s) | Live PostgreSQL + FastAPI `AsyncClient` (includes cookie/CSRF, water CRUD/isolation, ad-hoc exercise CRUD/isolation, 16-table schema tests) |
| TypeScript Lint | `npm.cmd run lint` (`tsc --noEmit`) | **0 errors** | Full frontend type check |
| Frontend Build | `npm.cmd run build` (`vite build`) | **PASSED** (1.03s) | 2103 modules, all JS chunks `< 422 kB` |
| Dependency Audit | `npm.cmd audit --audit-level=moderate` | **0 vulnerabilities** | Frontend npm dependencies |
| Alembic Revision | `Set-Location backend; python -m alembic current; python -m alembic heads` | **`d4e5f6a7b8c9 (head)`** | Live PostgreSQL 18 schema |
| Browser E2E / Manual UI | — | **Deferred to Phase 8** | Not executed per Phase 6.5.1 scope |
