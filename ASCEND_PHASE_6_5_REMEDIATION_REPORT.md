# ASCEND — Phase 6.5 Remediation Report

**Date:** 2026-11-25  
**Scope:** Detailed record of every defect, security gap, and QA challenge identified and remediated during Phase 6.5.

---

## 1. Mandatory Pre-Deployment Remediation Items

| ID | Category | Finding Before Fix | Remediation Applied | Files Modified |
| --- | --- | --- | --- | --- |
| **REM-01** | Auth / Security (4A) | Browser stored `refreshToken` and `accessToken` in `localStorage`, exposing refresh credentials to XSS. | Moved `accessToken` to memory only; migrated browser refresh tokens to `HttpOnly` `ascend_refresh_token` cookies (`SameSite=None; Secure` in prod, `SameSite=Lax` in dev, `path=/api/v1/auth`); enforced `X-Requested-With` / `Authorization` CSRF guard on cookie operations; added `logoutAll` flag on `LogoutRequest`. | `backend/app/api/v1/endpoints/auth.py`, `backend/app/schemas/auth.py`, `backend/app/main.py`, `src/services/api/client.ts`, `src/services/api/authApi.ts`, `src/App.tsx` |
| **REM-02** | Persistence / Nutrition (4B) | Water intake lived only in React state; `/intake/daily` returned `NutritionGoal.water_ml` target in `dailyTotals.waterMl`. | Added `water_intake_records` table + reversible Alembic migration `d4e5f6a7b8c9`, `WaterIntakeRecord` ORM model, `WaterService` + `GET/POST/PUT/DELETE /intake/water` endpoints, `dailyTotals.waterMl` + `waterTargetMl` split, and `App.tsx` `handleUpdateWater` persistence + login/recovery hydration. | `backend/alembic/versions/d4e5f6a7b8c9_phase6_5_water_and_exercise_owner.py`, `backend/app/models/nutrition.py`, `backend/app/models/user.py`, `backend/app/models/__init__.py`, `backend/app/schemas/nutrition.py`, `backend/app/services/nutrition_service.py`, `backend/app/api/v1/endpoints/intake.py`, `src/services/api/nutritionApi.ts`, `src/App.tsx` |
| **REM-03** | Persistence / Workouts (4C) | Ad-hoc exercises created in UI were stored only in React state (`ex-${Date.now()}`) and lost on refresh; `list_exercises` / `get_exercise_by_id` had no user scoping. | Added nullable `exercise_items.created_by_user_id` FK (`ON DELETE CASCADE`) in `d4e5f6a7b8c9`; scoped `get_workout_plan`, `list_exercises`, and `get_exercise_by_id` to system + owned exercises; added `POST /plans/{plan_id}/exercises`, `PUT /exercises/{id}`, `DELETE /exercises/{id}` with system-template protection; wired `handleAddExercise` in `App.tsx`. | `backend/alembic/versions/d4e5f6a7b8c9_phase6_5_water_and_exercise_owner.py`, `backend/app/models/workout.py`, `backend/app/schemas/workout.py`, `backend/app/services/workout_service.py`, `backend/app/api/v1/endpoints/workouts.py`, `src/services/api/workoutApi.ts`, `src/App.tsx` |

---

## 2. Additional Audit Fixes

| ID | Category | Finding Before Fix | Remediation Applied | Files Modified |
| --- | --- | --- | --- | --- |
| **AUD-01** | Production UI Polish | QA/demo debug controls (`Skeletons`, `Normal/Loading/Error` catalog toggle, `Test Error State`) rendered in production builds. | Gated all three controls behind `import.meta.env.DEV`. | `src/components/dashboard/DashboardView.tsx`, `src/components/diet/DietManagementView.tsx`, `src/components/coach/AiCoachView.tsx` |
| **AUD-02** | Frontend State Sync | `GoalsProfileView` and `ProgressTrackingView` initialized draft/modal state once before async profile/history hydration completed. | Added `useEffect` synchronization for `draftProfile`/`draftGoals` and `ProgressTrackingView` modal inputs. | `src/components/goals/GoalsProfileView.tsx`, `src/components/progress/ProgressTrackingView.tsx` |
| **AUD-03** | Auth Timing Side-Channel | `AuthService.authenticate_user` returned immediately on unknown email without running Argon2id verification. | Added dummy Argon2id verification (`_get_dummy_password_hash()`) on unknown email before raising `AuthenticationException`. | `backend/app/services/auth_service.py` |
| **AUD-04** | Bundle Optimization | Single-chunk vendor bundling increased initial JS payload. | Added function-based `manualChunks` in Vite 8 / Rolldown config (`charts`, `icons`, `react`). | `vite.config.ts` |

---

## 3. Independent QA Reviewer Findings & Fixes Applied

An Independent QA Reviewer subagent inspected the modified files line-by-line and identified 1 High-severity bug and 3 Low-severity gaps:

1. **[HIGH] Browser Sign-Out Skipped `/auth/logout` (`src/App.tsx`):**
   - `handleSignOut` checked `if (rt)` where `rt = getStoredRefreshToken()`. Because `getStoredRefreshToken()` returns `null` in browser mode, clicking Sign Out never revoked the server `UserRefreshSession` or cleared the `HttpOnly` cookie.
   - **Fix:** Updated `handleSignOut` to invoke `await authApi.logout(rt ?? undefined)` whenever `userAccount.isAuthenticated && !userAccount.isDemoAccount`.
2. **[LOW] Live Table Check Missing `water_intake_records` (`backend/tests/test_migrations.py`):**
   - `test_live_database_tables_exist` checked 15 tables instead of 16.
   - **Fix:** Added `"water_intake_records"` to `expected_domain_tables`.
3. **[LOW] Double Argon2id Work on Unknown Email (`backend/app/services/auth_service.py`):**
   - Unknown-email login called both `hash_password` and `verify_password`.
   - **Fix:** Cached `_DUMMY_PASSWORD_HASH` via `_get_dummy_password_hash()` so unknown-email login executes `verify_password` once.
4. **[LOW] Optimistic Water State Not Reverted on Error (`src/App.tsx`):**
   - `handleUpdateWater` left optimistic `waterIntakeMl` mutated if the API request failed.
   - **Fix:** Reverted `waterIntakeMl` by `-deltaMl` in the `catch` block.

---

## 4. Regression Tests Added

- `backend/tests/test_auth.py::test_httponly_refresh_cookie_and_csrf_protection`
- `backend/tests/test_nutrition.py::test_water_intake_crud_daily_aggregation_and_isolation`
- `backend/tests/test_workout.py::test_adhoc_exercise_persistence_and_cross_user_isolation`
- `backend/tests/test_migrations.py::test_all_15_entities_exist_in_metadata` & `test_live_database_tables_exist` updated for 16 tables (`water_intake_records`)

All 56 pytest cases, `tsc --noEmit`, and `vite build` passed after the final edit.
