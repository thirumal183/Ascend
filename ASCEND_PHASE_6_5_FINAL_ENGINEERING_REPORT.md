# ASCEND — Phase 6.5 Final Pre-Deployment Engineering Report

**Date:** 2026-11-25  
**Branch:** `main` (uncommitted working tree awaiting user review)  
**Database Revision:** `d4e5f6a7b8c9 (head)` (PostgreSQL 18 `ascend_db`, reversible down to `9c4f8a2b1d7e`)  
**Release Verdict:** **READY FOR DEPLOYMENT** *(with browser-based E2E and manual UI testing explicitly deferred to Phase 8 post-deployment)*

---

## 1. Executive Summary

Phase 6.5 performed a final pre-deployment engineering, security hardening, persistence remediation, and independent QA verification pass across the ASCEND platform prior to Phase 7 deployment (Render Free backend, Cloudflare Pages frontend, Neon Free PostgreSQL).

All three mandatory functional and security gaps identified entering Phase 6.5—browser `localStorage` refresh-token persistence, missing PostgreSQL persistence for water intake, and missing PostgreSQL persistence for user-added ad-hoc exercises—have been implemented end-to-end, backed by a reversible Alembic migration (`d4e5f6a7b8c9`) and automated regression tests. An Independent QA Reviewer subagent challenged the implementation line by line, caught one High-severity browser sign-out bug (`handleSignOut` in `src/App.tsx`) and three Low-severity items, all of which were fixed and re-verified.

---

## 2. Architecture & Security Posture

### 2.1 HttpOnly Cookie Refresh-Token Architecture & CSRF Protection
- **Browser Token Storage (`src/services/api/client.ts`):**
  - `accessToken` is held strictly in module-scoped memory (`inMemoryAccessToken`) and is never written to `localStorage`.
  - `getStoredRefreshToken()` returns `null` in browser runtimes; `setStoredTokens()` stores only a non-sensitive boolean hint (`ascend_has_live_session = '1'`) and actively clears any legacy `ascend_access_token` / `ascend_refresh_token` keys.
  - Non-browser Node/CLI test runners (`tsx` integration suites) retain `inMemoryCliRefreshToken` so automated CLI integration tests remain compatible.
- **Backend Cookie Issuance & CSRF Guard (`backend/app/api/v1/endpoints/auth.py`, `backend/app/main.py`):**
  - `/api/v1/auth/register`, `/token`, `/login`, and `/refresh` set `ascend_refresh_token` with `httponly=True` and `path="/api/v1/auth"`.
  - In production (`ENVIRONMENT != "development"`), cookies use `Secure=True; SameSite=None` for cross-origin Cloudflare Pages $\leftrightarrow$ Render requests; in local development (`ENVIRONMENT == "development"`), cookies use `Secure=False; SameSite=Lax`.
  - `_resolve_refresh_token` enforces a custom non-simple header (`X-Requested-With` or `Authorization`) whenever authenticating via the `ascend_refresh_token` cookie, rejecting CSRF attempts without custom headers with HTTP `403`.
  - CORS `allow_headers` in `backend/app/main.py` explicitly permits `X-Requested-With` alongside `Authorization`, `Content-Type`, and `Accept`, with `allow_credentials=True`.
- **Browser Session Recovery & Sign-Out (`src/App.tsx`):**
  - `recoverLiveSession` exchanges the `HttpOnly` cookie via `authApi.refresh()` when `hasLiveSessionHint()` is set and no in-memory access token exists.
  - `handleSignOut` invokes `authApi.logout(rt ?? undefined)` whenever `userAccount.isAuthenticated && !userAccount.isDemoAccount`, ensuring server-side session revocation and `HttpOnly` cookie clearing even though `rt` is `null` in browser mode.

### 2.2 Unknown-Email Timing Equalization
- `AuthService.authenticate_user` (`backend/app/services/auth_service.py`) executes `verify_password` against a lazily precomputed module-level Argon2id hash (`_get_dummy_password_hash()`) when an email is not found, equalizing response latency with invalid-password attempts.

### 2.3 Water-Intake Persistence (`water_intake_records`)
- **Schema & Migration:** `d4e5f6a7b8c9` creates `water_intake_records` (`id`, `user_id` FK `ON DELETE CASCADE`, `amount_ml` CHECK `> 0 AND <= 5000`, `date_logged`, `logged_at`, `notes`, `created_at`, index `idx_water_intake_user_date`).
- **API & Aggregation:** `backend/app/api/v1/endpoints/intake.py` exposes `GET /intake/water`, `POST /intake/water`, `PUT /intake/water/{record_id}`, and `DELETE /intake/water/{record_id}` via `WaterService`, enforcing `current_user.id` ownership (`403 FORBIDDEN` on cross-user access). `IntakeService.get_daily_intake` aggregates actual logged `WaterIntakeRecord.amount_ml` into `dailyTotals.waterMl` alongside `dailyTotals.waterTargetMl`.
- **Frontend Wiring:** `src/services/api/nutritionApi.ts` and `src/App.tsx` (`handleUpdateWater`, login/recovery hydration) persist both positive (`logWater`) and negative (`deleteWater` / `updateWater`) hydration adjustments and revert optimistic state if a network error occurs.

### 2.4 User-Scoped Ad-Hoc Exercise Persistence (`exercise_items.created_by_user_id`)
- **Schema & Migration:** `d4e5f6a7b8c9` adds nullable `created_by_user_id` (`UUID`, FK to `users.id ON DELETE CASCADE`, indexed) to `exercise_items`.
- **Tenant Isolation & Template Protection:** `WorkoutService` (`backend/app/services/workout_service.py`) filters `get_workout_plan`, `list_exercises`, and `get_exercise_by_id` to `created_by_user_id IS NULL OR created_by_user_id == user_id`. `update_exercise` and `delete_exercise` reject mutations to system templates (`created_by_user_id IS NULL`) and other users' exercises with `403 FORBIDDEN`.
- **Endpoints & Frontend Wiring:** `backend/app/api/v1/endpoints/workouts.py` exposes `POST /workouts/plans/{plan_id}/exercises`, `PUT /workouts/exercises/{exercise_id}`, and `DELETE /workouts/exercises/{exercise_id}`, wired into `src/services/api/workoutApi.ts` and `src/App.tsx` (`handleAddExercise`).

---

## 3. Production Frontend Polish & Build Optimization
- **Debug UI Gating:** Development-only QA controls (`Skeletons` in `DashboardView.tsx`, `Normal / Loading / Error` catalog tester in `DietManagementView.tsx`, and `Test Error State` in `AiCoachView.tsx`) are gated behind `import.meta.env.DEV` so they are stripped from production builds.
- **Async Draft Synchronization:** `GoalsProfileView.tsx` and `ProgressTrackingView.tsx` synchronize draft/modal state with asynchronously hydrated `userProfile`, `goals`, and `progressHistory` props via `useEffect`.
- **Bundle Splitting:** `vite.config.ts` splits `charts` (`recharts`/`d3-*`), `icons` (`lucide-react`), and `react` (`react`/`react-dom`) via function-based `manualChunks`, keeping every production JS chunk under `422 kB` (`charts` `421.62 kB`, `index` `282.64 kB`, `react` `207.11 kB`).

---

## 4. Verification Results

| Check | Command / Target | Outcome | Scope & Notes |
| --- | --- | --- | --- |
| Backend Unit & Integration Tests | `python -m pytest tests -v` | **56/56 PASSED** | Ran after final edit; includes new cookie/CSRF, water CRUD/isolation, ad-hoc exercise CRUD/isolation, and 16-table schema tests |
| TypeScript Type Check | `npm.cmd run lint` (`tsc --noEmit`) | **0 errors** | Ran after final edit |
| Production Build | `npm.cmd run build` (`vite build`) | **PASSED (1.77s)** | Ran after final edit; 2103 modules, all chunks `< 422 kB` |
| Dependency Security Audit | `npm.cmd audit --audit-level=moderate` | **0 vulnerabilities** | Verified against npm registry |
| Batch 7 E2E API Integration | `npx.cmd tsx scripts/test_batch7_integration.ts` | **44/44 PASSED** | Executed against live Uvicorn on `127.0.0.1:8001` before final `handleSignOut` / `test_migrations.py` / `_get_dummy_password_hash` edits |
| Batch 8 Security & Isolation | `npx.cmd tsx scripts/test_batch8_security_audit.ts` | **22/22 PASSED** | Executed against live Uvicorn on `127.0.0.1:8001` |
| Batch 8 Multi-Pathway Journeys | `npx.cmd tsx scripts/test_batch8_pathways.ts` | **33/33 PASSED** | Executed against live Uvicorn on `127.0.0.1:8001` |
| Alembic Migration | `alembic upgrade head; downgrade -1; upgrade head` | **PASSED** | Live PostgreSQL 18 at `d4e5f6a7b8c9 (head)` |
| Browser E2E / Manual UI | — | **Deferred** | Intentionally deferred to Phase 8 post-deployment |
