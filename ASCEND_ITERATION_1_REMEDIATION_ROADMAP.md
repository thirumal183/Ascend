# ASCEND — Pre-Release Iteration 1: Remediation Roadmap (For Iteration 2)

**Date:** 2026-11-24  
**Source Audit:** [ASCEND_ITERATION_1_DEEP_AUDIT_REPORT.md](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/ASCEND_ITERATION_1_DEEP_AUDIT_REPORT.md)  
**Target:** Iteration 2 Bug-Fixing, Contract Alignment, Security Hardening & Performance Polish

---

## 1. Prioritised Remediation Phases

### Wave 1 — Security & Authorization Blockers (P1 Security / Data Integrity)
1. **Fix `WorkoutPlan` Ownership & Privilege Escalation (`AUD-P1-01`)**
   - Add `created_by_user_id` (`UUID`, FK -> `users.id`, `ON DELETE CASCADE`, nullable for system templates) to `WorkoutPlan` via a new Alembic migration.
   - Remove `isSystemTemplate` from `CreateWorkoutPlanRequest` and force `is_system_template=False`, `created_by_user_id=current_user.id` in `WorkoutService.create_workout_plan`.
   - Scope `list_workout_plans`, `get_workout_plan`, and `delete_workout_plan` to `is_system_template == True` OR `created_by_user_id == current_user.id` (and forbid deleting system templates or other users' plans).
2. **Enforce `SECRET_KEY` Production Guard (`AUD-P1-08`) & Harden `jwt_version` (`AUD-P3-01`)**
   - Add Pydantic `@model_validator(mode="after")` in `Settings` rejecting the dev fallback key or keys `< 32` chars when `ENVIRONMENT != "development"`.
   - Require `token_jwt_version is not None` and `isinstance(token_jwt_version, int)` in `deps.py`.
   - Default `DEBUG: bool = False` in `config.py` (`AUD-P3-06`).
3. **Fix Refresh Token Concurrency Race & Lineage Pointer (`AUD-P2-01`)**
   - Lock `UserRefreshSession` with `.with_for_update()` (or atomic `UPDATE ... WHERE is_revoked = false`) in `AuthService.rotate_refresh_token`.
   - Fix inverted lineage: set `session.replaced_by_token_id = new_session.id` after flushing `new_session`.
   - Add `_retried?: boolean` guard to `apiClient` in `src/services/api/client.ts` to prevent infinite refresh loops on persistent `401`.

### Wave 2 — Core Live-Mode Persistence & Contract Alignment (P1 Functional)
4. **Fix `ActivityLevel.CompetitiveAthlete` Mapping (`AUD-P1-02`) & Onboarding UX (`AUD-P1-05`)**
   - Map `ActivityLevel.CompetitiveAthlete` -> `'Extremely Active'` in `mapFrontendActivityLevelToBackend`.
   - Render registration error feedback and `isSubmitting` disabled state inside `OnboardingWizardModal`.
   - Sync pathway-specific defaults in `OnboardingWizardModal` whenever `isOpen` / `pathway` changes.
5. **Eliminate Demo Data Leaks & Phantom Optimistic State (`AUD-P1-03`)**
   - Reset `intakeRecords`, `progressHistory`, `workoutPlans`, `chatMessages`, `waterIntakeMl`, and `stepsToday` cleanly when entering live mode (even if backend returns `[]`).
   - Replace `foodCatalog` with live backend results (`setFoodCatalog(liveFoods)`) instead of prepending to `SAMPLE_FOOD_DATABASE` (`food-*`).
   - Roll back `tempId` in `handleAddIntakeRecord` if `nutritionApi.logIntake` rejects.
6. **Implement `/api/v1/users` Endpoints & Wire Unpersisted UI Flows (`AUD-P1-04`, `AUD-P1-05`)**
   - Create `backend/app/api/v1/endpoints/users.py` (`PUT /users/me/profile`, `POST /users/me/pathway`, `PUT /users/me/goals`) and mount in `api.py`.
   - Wire `GoalsProfileView`, `SettingsView`, `PathwaySelectionModal`, and `OnboardingWizardModal` custom Step 3 goals to the new endpoints.
   - Wire `WorkoutManagementView` to `workoutApi` (`getPlanDetails`, `createSession`, `updateSetLogs`, `listSessions`, `createPlan`, `deletePlan`).
   - Wire `AiCoachView` to persist `conversationId`, load `listConversations`/`getConversation` on sign-in, and call `deleteConversation` on "Clear History".
   - Wire `ReportsView` to `nutritionApi.getIntakeReports` + `workoutApi.listSessions`, and `CalendarView` to real session/intake data + proper weekday alignment (`AUD-P2-08`).
   - Add water intake persistence (either on `ProgressRecord` or dedicated field/endpoint) so `DashboardView` water updates survive reload (`AUD-P1-04`, `AUD-P2-09`).

### Wave 3 — Domain Calculation & Database Performance Fixes (P1/P2 Backend & DB)
7. **Fix Nutrition Scaling & Pathway Goal Calculations (`AUD-P1-06`, `AUD-P1-07`, `AUD-P2-09`, `AUD-P2-10`)**
   - Fix `calculate_scaled_nutrients` for `reference_unit == "serving"` (`base_grams = reference_quantity * grams_per_serving`) and align `cup` to `240g` across backend and frontend.
   - Align `calculate_baseline_nutrition` with `API_SPECIFICATION.md` (`ATHLETIC_PERFORMANCE` `+200 kcal`, `-420 kcal` deficit, `2.1 g/kg` muscle-gain protein, `6,000 kcal` ceiling, deficit/surplus caps).
   - Preserve genuine `0.0` fiber/sodium in `get_daily_intake` via `has_measured_*` flags, and proportionally scale snapshot when `food_id` is `NULL` in `update_intake`.
   - Update `ProgressService.create_or_upsert_progress_record` to only overwrite fields in `payload.model_fields_set`, and use `INSERT ... ON CONFLICT DO UPDATE` (`AUD-P2-03`).
8. **Optimize Database Queries, Indexes & Pool Hygiene (`AUD-P2-02`, `AUD-P2-03`, `AUD-P2-06`, `AUD-P3-03`, `AUD-P3-04`, `AUD-P3-05`)**
   - Replace `func.lower(...).like(...)` in `FoodService.search_foods` with `.ilike(...)` to restore `pg_trgm` GIN index scans.
   - Replace $N+2$ loop in `WorkoutService.upsert_set_logs` with bulk `INSERT ... ON CONFLICT DO UPDATE` and validate `exerciseItemId`s.
   - Commit `user_msg` in `AICoachService.process_chat_message` *before* awaiting `call_gemini_api` so DB connections are not held during 10s HTTP calls.
   - Add `pool_recycle=1800`, PostgreSQL `statement_timeout`, domain `CHECK` constraints, and clean up redundant B-tree indexes in a follow-up Alembic migration.

### Wave 4 — Hardening, Async Offloading & Frontend Polish (P2/P3)
9. **Backend Hardening (`AUD-P2-04`, `AUD-P2-05`, `AUD-P2-06`, `AUD-P2-07`, `AUD-P2-10`)**
   - Offload Argon2id `hash_password` / `verify_password` via `asyncio.to_thread`.
   - Enforce `max_length=128` on passwords and add rate limiting (`slowapi` or equivalent) on `/auth/*`, `/ai/chat`, `/foods/search`.
   - Move `GEMINI_API_KEY` from URL query string to `x-goog-api-key` header and use Gemini's `systemInstruction` field + multi-turn history.
   - Add global `RequestValidationError` and `SQLAlchemyError` handlers returning `{"error": ...}`; move `httpx` to `[project] dependencies` in `pyproject.toml`.
   - Restrict CORS `allow_methods` and `allow_headers` to explicit allowlists; add security headers middleware; plan `HttpOnly` cookie migration for refresh tokens.
10. **Frontend Bundle Splitting, Cleanup & A11y (`AUD-P2-11`, `AUD-P3-07`–`AUD-P3-11`)**
    - Lazy-load auxiliary views (`ReportsView`, `CalendarView`, `AiCoachView`, `ProgressTrackingView`, `SettingsView`, `GoalsProfileView`) with `React.lazy` + `<Suspense>`.
    - Remove unused packages (`@google/genai`, `express`, `dotenv`, `@types/express`) from `package.json` and update `vite.config.ts` to `import.meta.dirname`.
    - Remove production-exposed debug/error-tester buttons, add modal focus trapping, fix `AuthModal` `"Min. 6 characters"` copy, fix `CoachMetricItem` `'warning'` type & `as any` casts, and switch CSV export to `Blob` with formula sanitization.

---

## 2. Exact Files Likely to Change in Iteration 2

### Backend (`backend/`)
- `backend/pyproject.toml` (move `httpx` to runtime dependencies)
- `backend/alembic/versions/<new_migration>.py` (add `WorkoutPlan.created_by_user_id`, domain `CHECK` constraints, drop redundant indexes, guard `v_food_items_with_nutrients`)
- `backend/app/core/config.py` (`SECRET_KEY` validator, `DEBUG=False` default, strict CORS parser)
- `backend/app/core/database.py` (`pool_recycle`, `statement_timeout`, standardized commit ownership)
- `backend/app/core/security.py` (sanitize JWT decode error message)
- `backend/app/main.py` (global `RequestValidationError` & `SQLAlchemyError` handlers, explicit CORS methods/headers, rate-limiter & security headers middleware)
- `backend/app/api/v1/api.py` (mount `/users` router)
- `backend/app/api/v1/deps.py` (fail-closed `jwt_version` check)
- `backend/app/api/v1/endpoints/auth.py` (remove unused `authorization` header, rate-limit decorators)
- `backend/app/api/v1/endpoints/users.py` *(new)* (`PUT /users/me/profile`, `POST /users/me/pathway`, `PUT /users/me/goals`)
- `backend/app/api/v1/endpoints/foods.py` (`min_length=2` on `q` when non-empty)
- `backend/app/api/v1/endpoints/workouts.py` (pass `current_user` to `create_workout_plan`, `get_workout_plan`, `delete_workout_plan`)
- `backend/app/api/v1/endpoints/health.py` (sanitize raw DB error message)
- `backend/app/models/workout.py` (`WorkoutPlan.created_by_user_id` FK & relationship)
- `backend/app/models/views.py` (`NULLIF` guard & macro filter)
- `backend/app/schemas/auth.py` (`max_length=128` on passwords, optional onboarding custom targets)
- `backend/app/schemas/workout.py` (remove `isSystemTemplate` from `CreateWorkoutPlanRequest`)
- `backend/app/services/auth_service.py` (`asyncio.to_thread` Argon2id, `with_for_update()` refresh lock, fix `replaced_by_token_id` direction, aligned `NutritionGoalCalculator`)
- `backend/app/services/nutrition_service.py` (GIN-friendly `ilike`, `reference_unit == "serving"` fix, `has_measured_*` flags, deleted-food snapshot scaling, UTC date)
- `backend/app/services/workout_service.py` (owner-scoped plans, bulk `ON CONFLICT` set-log upsert, `exerciseItemId` validation)
- `backend/app/services/progress_service.py` (`INSERT ... ON CONFLICT`, `model_fields_set` partial upsert, logged-days average)
- `backend/app/services/ai_coach_service.py` (`x-goog-api-key` header, `systemInstruction`, multi-turn history, pre-HTTP commit, dynamic calorie status)

### Frontend (`src/` & root)
- `package.json` & `vite.config.ts` (remove unused deps, `import.meta.dirname`)
- `index.html` (CSP / security meta headers)
- `src/types/ascend.ts` (add `'warning'` to `CoachMetricItem.status`)
- `src/services/api/client.ts` (`_retried` flag on 401 retry)
- `src/services/api/mappers.ts` (map `CompetitiveAthlete` -> `'Extremely Active'`, remove `as any` casts)
- `src/services/api/authApi.ts` / `src/services/api/usersApi.ts` *(new)* (profile/pathway/goals API client)
- `src/services/api/progressApi.ts` (expose `getSummary`)
- `src/services/ascendApiService.ts` (align `cup` to `240g`, clean dead code)
- `src/App.tsx` (reset demo state on live login, roll back failed `logIntake`, wire workout/profile/goals/water/AI conversation persistence, `React.lazy` views)
- `src/components/auth/AuthModal.tsx` (fix `"Min. 6 characters"` & prototype copy)
- `src/components/auth/OnboardingWizardModal.tsx` (sync pathway defaults, loading/error UI, custom goals persistence)
- `src/components/diet/DietManagementView.tsx` (align `cup` label/math, remove debug state switcher & `as any`)
- `src/components/workouts/WorkoutManagementView.tsx` (empty `workoutPlans` guard, wire `workoutApi`)
- `src/components/progress/ProgressTrackingView.tsx` (sync modal inputs on async load, wire edit/delete)
- `src/components/coach/AiCoachView.tsx` (pass `conversationId`, load/delete conversations, remove debug error button)
- `src/components/goals/GoalsProfileView.tsx` (sync props on async load)
- `src/components/reports/ReportsView.tsx` (wire `getIntakeReports` + `listSessions`, `Blob` CSV export with formula sanitization)
- `src/components/calendar/CalendarView.tsx` (real workout sessions + weekday offset alignment)
- `src/components/dashboard/DashboardView.tsx` (remove production debug Skeletons button)
- `src/components/ui/Modal.tsx` (focus trap & focus restoration)

### Tests (`backend/tests/`, `scripts/`)
- `backend/tests/test_auth.py`, `test_nutrition.py`, `test_workout.py`, `test_progress.py`, `test_ai_coach.py` (regression tests for every P1/P2 fix above)
- `scripts/test_batch8_pathways.ts` (fix `passedTests` counter denominator `33/33`)
- `scripts/test_batch8_security_audit.ts` (add `WorkoutPlan` cross-user isolation & `isSystemTemplate` privilege test)
