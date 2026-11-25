# ASCEND — Final Comprehensive Engineering Audit & Release Report

**Date:** 2026-11-25
**Branch:** `main`
**Baseline Commit:** `ec290396fcbd41e81ffc37f7bf85a85bd35426f5`
**Final Verdict:** **READY WITH MINOR CONDITIONS**
*(All Critical and High code/security defects discovered during this audit are fixed and verified. Condition: interactive Chrome/Playwright viewport verification could not run in this environment because Chrome remote debugging `DevToolsActivePort` and local Playwright were unavailable; Neon production migration and catalogue seeding remain intentionally deferred to deployment.)*

---

## 1. Executive Summary
This final pre-release engineering iteration audited the full ASCEND stack (FastAPI backend, PostgreSQL/Alembic schema, food ingestion pipeline, Vercel same-origin proxy, and React 19 / TypeScript frontend), fixed all confirmed Critical and High defects plus high-impact Medium/Low issues, completed a zero-context independent code review (catching and fixing two additional Medium UI/attribution regressions), and verified the entire codebase with automated regression suites.

**Neon production was not modified, migrated, or seeded. Nothing was deployed, committed, or pushed.**

---

## 2. Initial Repository State & Baseline Commit
- **Branch:** `main`
- **HEAD:** `ec290396fcbd41e81ffc37f7bf85a85bd35426f5`
- **Pre-audit uncommitted changes:** Phase 7 food provenance schema (`e7f8a9b0c1d2`), `backend/app/db/ingest/`, `backend/tests/test_ingestion.py`, UI provenance cleanup, `docs/` updates, and `scripts/test_food_catalogue_ui_and_live_search.ts`.
- **Excluded raw data:** `backend/data/` is gitignored and verified absent from `git status --short`.

---

## 3. Skills Discovered & Applied
1. **`systematic-debugging`**: Applied to trace root causes before editing—identifying that live `DietManagementView` only filtered the initial 50-item `foodCatalog` in memory, that `handleToggleExercise` mutated a closure variable inside a React state updater, and that `AuthService.logout` treated missing refresh tokens as global logouts.
2. **`test-driven-development` & `verification-before-completion`**: Applied by writing/updating `scripts/test_food_catalogue_ui_and_live_search.ts` and re-running `tsc --noEmit`, `vite build`, `pytest`, Batch 7, Batch 8, and Vercel proxy tests after final edits before making any pass claims.
3. **`security-audit`**: Guided the backend/proxy audit across reverse-proxy IP resolution, IDOR checks (`exerciseItemId` ownership in `upsert_set_logs`), silent global logout, HSTS/`Cache-Control: no-store` headers, and demo-account hijacking (`email.includes('demo')`).
4. **`ascend-product-design`, `ascend-frontend-quality`, `web-design-guidelines`, `vercel-react-best-practices`**: Applied to remove per-food provenance clutter, fix WCAG AA `text-slate-400` contrast on light surfaces, stabilize `useCallback` search props, and fix mobile (`375px`) layouts in `CalendarView`, `AiCoachView`, `FoodComparisonModal`, and `DietManagementView`.
5. **`requesting-code-review`**: Applied by dispatching a zero-context `Independent Release Reviewer` subagent after fixes, which caught `FoodComparisonModal` dropping searched live foods and stale `ICMR-NIN` text in `LandingPageView.tsx`'s `SHOWCASE_TABS`.
6. **`webapp-testing` / `browser`**: Attempted browser verification against `http://127.0.0.1:3001/`; cleanly documented the environment limitation when Chrome `DevToolsActivePort` and Python Playwright were unavailable.

---

## 4. Backend Audit Findings
- **High — Reverse-Proxy Client IP Ignored (`backend/app/core/rate_limit.py`, `backend/app/api/v1/deps.py`) [FIXED]:** `rate_limit()` and `get_client_info()` read `request.client.host`, causing all Vercel/Render users to share one rate-limit bucket. Fixed with `resolve_client_ip(request)` reading `x-vercel-forwarded-for` / `x-forwarded-for` first hop.
- **Medium — Silent Global Logout on Missing Refresh Token (`backend/app/api/v1/endpoints/auth.py`, `backend/app/services/auth_service.py`) [FIXED]:** Missing cookie/body token triggered the `else:` branch (`user.jwt_version += 1`). Fixed by passing explicit `logout_all: bool`.
- **Medium — `exerciseItemId` IDOR & Duplicate Set Crash (`backend/app/services/workout_service.py`) [FIXED]:** `upsert_set_logs` now restricts `ExerciseItem` references to `created_by_user_id IS NULL OR created_by_user_id == current_user.id` and deduplicates `(exerciseName, setNumber)` before `ON CONFLICT DO UPDATE`.
- **Medium — `protein_g_per_kg` Check-Constraint Crash (`backend/app/api/v1/endpoints/users.py`) [FIXED]:** `PUT /users/me/goals` now clamps `protein_g_per_kg` to `[1.0, 3.5]` instead of raising `IntegrityError` (HTTP 500).
- **Low — HSTS, `Cache-Control: no-store`, AI Coach History Order, Pathway Schema Validation (`backend/app/main.py`, `backend/app/services/ai_coach_service.py`, `backend/app/schemas/workout.py`) [FIXED]:** Added HSTS (non-dev), `Cache-Control: no-store` on `/auth/*`, descending+reversed 10-message AI history, and `Literal` validation on `CreateWorkoutPlanRequest.recommendedPathway`.
- **Medium/Low Deferred:**
  - `FoodService.search_foods` `alternate_names` trigram index & `COUNT(*)` optimization (`nutrition_service.py`) — deferred to avoid adding another Alembic migration before Neon deployment; `test_food_catalogue_ui_and_live_search.ts` confirmed fast live queries across 8,234 foods.
  - Streaming chunked-body size guard (`main.py`), `TokenResponse.refreshToken` body emission (retained for CLI/token clients tested in Batch 7), rate-limiter bucket eviction (`rate_limit.py`), and `WorkoutService.list_workout_plans` pathway filter (`workout_service.py`) — documented as deferred low/medium hardening items.

---

## 5. Database & Migration Findings
- **Schema & 3NF Integrity:** All 16 core tables and `v_food_items_with_nutrients` verified via `test_migrations.py` and `test_models.py`. `food_nutrients` preserves `None` for unmeasured micronutrients; `intake_records` snapshots remain immutable.
- **Migration `e7f8a9b0c1d2`:** Verified chaining cleanly from `d4e5f6a7b8c9` with symmetric `upgrade()`/`downgrade()` and matching ORM constraints (`ck_food_source_provider`, `ck_food_verification_status`, `uq_food_items_source_identity`).
- **Local Runtime Database (`localhost:5432/ascend_db`):** Migrated to `e7f8a9b0c1d2` and seeded (`8,157` USDA FDC + `15` Indian recipe estimates + `3` system workout plans; `8,234` public `food_items` total including `62` pre-existing local/test rows).

---

## 6. Frontend Functionality Findings
- **Critical — Undo Add Temporary ID (`src/App.tsx`, `src/components/diet/DietManagementView.tsx`) [FIXED]:** `handleAddIntakeRecord` now returns `Promise<string>` resolving to the persisted backend UUID so Undo deletes the real PostgreSQL row.
- **Critical — `FoodComparisonModal` Hardcoded Mock IDs & `selectedFood` Default (`src/components/diet/DietManagementView.tsx`) [FIXED]:** Initialized `comparisonFoodIds` to `[]` in live mode, merged `foodCatalog` + `liveSearchResults` into `comparisonFoodPool` (fixing the independent review finding), synced `selectedFood` when `foodCatalog` loads, and guarded `food-default`.
- **Critical — Live `localStorage` Leakage & Auth Recovery (`src/App.tsx`) [FIXED]:** `prototypeSessionStorage` now loads and saves **only** for Demo Mode (`usingDemoData || userAccount.isDemoAccount`); failed `recoverLiveSession` resets `userAccount` and returns to landing.
- **High — Workout State Updater Side-Effects, Shared Session ID, N-Request Reset (`src/App.tsx`, `src/components/workouts/WorkoutManagementView.tsx`) [FIXED]:** Computed `nextPlan` before `setWorkoutPlans`, keyed `workoutSessionIdsByPlan` by `plan.id`, and added single-request `handleResetWorkoutPlan`.
- **High — Demo Mode Leakage (`src/App.tsx`, `src/components/auth/AuthModal.tsx`, `src/components/progress/ProgressTrackingView.tsx`) [FIXED]:** Restricted demo shortcut to exact `alex.rivera@ascend.app`, guarded `handleToggleDemoData` for live accounts, and hid `Load Demonstration History` in live mode.
- **High/Medium — Stable Search Prop & Duplicate `<StartupIntro />` (`src/App.tsx`) [FIXED]:** Wrapped `handleSearchFoods` in `useCallback` and removed the duplicate `<StartupIntro />`.
- **Medium — Fabricated Check-In Telemetry (`src/components/progress/ProgressTrackingView.tsx`) [FIXED]:** Stopped fabricating `goals.dailyCalories` and `workoutCompleted: true` on weight check-ins.
- **Medium Deferred:** Modal focus trapping (`Modal.tsx`), `text-slate-400` in secondary views (`ReportsView`, `Sidebar`), and custom-food delete UI button in `DietManagementView` (`onDeleteCustomFood` remains wired in `App.tsx` and API-tested).

---

## 7. Security Findings Summary
- **Fixed:** Reverse-proxy IP extraction in `rate_limit.py` & `deps.py`, silent global logout prevention in `auth.py`/`auth_service.py`, `exerciseItemId` IDOR in `workout_service.py`, `protein_g_per_kg` 500 crash in `users.py`, HSTS + `Cache-Control: no-store` in `main.py`, and demo email hijacking in `AuthModal.tsx`/`App.tsx`.
- **Verified Passing:** Batch 8 Security & Cross-Tenant Isolation (`22/22`), `npm.cmd audit --audit-level=moderate` (`0` vulnerabilities), `api/proxy.ts` security suite (`16/16`), and `.gitignore` exclusion of `.env*` and `backend/data/`.

---

## 8. UI/UX & Performance Improvements
- Removed `Data Source & License` row from `FoodComparisonModal.tsx` and updated `LandingPageView.tsx` `SHOWCASE_TABS` (`Trusted USDA & culinary food values` / `USDA FDC / Culinary`) so nutrition attribution appears solely in the homepage Methodology section (`Open Food Facts` = `Pending Import`, `ICMR-NIN IFCT 2017` = `Pending Authorization`).
- Improved mobile (`375px`/`390px`) layouts in `CalendarView.tsx`, `AiCoachView.tsx`, `FoodComparisonModal.tsx`, and `DietManagementView.tsx`, and improved contrast (`text-slate-400` -> `text-slate-500`) on food alternate names and calendar empty labels.
- Stabilized `handleSearchFoods` with `useCallback` to eliminate redundant search requests on unrelated `App` renders.

---

## 9. Responsive / Browser Verification Evidence
- **Status:** **Not Completed (Environment Limitation)**
- **Exact Blocker:** The `browser` subagent could not attach to Chrome (`ENOENT: no such file or directory, open 'C:\Users\thiru\AppData\Local\Google\Chrome\User Data\DevToolsActivePort'`), and Python `playwright` is not installed locally (`no python playwright`).
- **Impact:** Automated DOM/CSS/TypeScript/API checks verified layouts and data flows, but live rendered screenshots across `1440×900`, `1366×768`, `768×1024`, `390×844`, and `375×812` require Chrome remote debugging or Playwright on the user's machine.

---

## 10. All Modified & Created Files (Audit + Integration)
- **Backend:** `.gitignore`, `backend/alembic/versions/e7f8a9b0c1d2_phase7_food_provenance_and_source_metadata.py`, `backend/app/db/ingest/*`, `backend/app/models/nutrition.py`, `backend/app/schemas/nutrition.py`, `backend/app/schemas/workout.py`, `backend/app/services/nutrition_service.py`, `backend/app/services/auth_service.py`, `backend/app/services/workout_service.py`, `backend/app/services/ai_coach_service.py`, `backend/app/api/v1/deps.py`, `backend/app/api/v1/endpoints/auth.py`, `backend/app/api/v1/endpoints/users.py`, `backend/app/core/rate_limit.py`, `backend/app/main.py`, `backend/tests/test_ingestion.py`.
- **Frontend:** `src/App.tsx`, `src/types/ascend.ts`, `src/data/mockData.ts`, `src/services/api/nutritionApi.ts`, `src/services/api/mappers.ts`, `src/components/auth/AuthModal.tsx`, `src/components/diet/DietManagementView.tsx`, `src/components/diet/FoodDetailsModal.tsx`, `src/components/diet/FoodComparisonModal.tsx`, `src/components/landing/LandingPageView.tsx`, `src/components/progress/ProgressTrackingView.tsx`, `src/components/workouts/WorkoutManagementView.tsx`, `src/components/coach/AiCoachView.tsx`, `src/components/calendar/CalendarView.tsx`.
- **Docs & Tests:** `docs/DATABASE_AND_API.md`, `docs/DEPLOYMENT_GUIDE.md`, `docs/PROJECT_DOCUMENTATION.md`, `docs/FOOD_DATA_PROVENANCE_AND_INGESTION.md`, `scripts/test_food_catalogue_ui_and_live_search.ts`, `ASCEND_OFFICIAL_NUTRITION_INTEGRATION_REPORT.md`, `ASCEND_FINAL_ENGINEERING_AUDIT_REPORT.md`.

---

## 11. Exact Regression Verification Results
| Suite / Check | Scope & Target | Result |
| :--- | :--- | :--- |
| `npm.cmd run lint` (`tsc --noEmit`) | Full frontend TypeScript check (after final edit) | **Passed (0 errors)** |
| `npm.cmd run build` (`vite build`) | Production bundle (`2105` modules, after final edit) | **Passed** |
| `npx.cmd tsx scripts/test_food_catalogue_ui_and_live_search.ts` | UI cleanliness, Demo Mode (36 items), Live `:8000` + `ascend_db` (`chicken`: 20, `oats`: 20, `dal`: 10), meal logging (after final edit) | **Passed** |
| `git diff --check` | Whitespace & conflict marker hygiene (after final edit) | **Passed (exit 0)** |
| `pytest tests/ -v` | Full backend suite against isolated PG18 `localhost:5434/ascend_test` (after all backend edits) | **63/63 Passed** |
| `npx.cmd tsx scripts/test_batch7_integration.ts` | E2E integration against local Uvicorn `:8011` + `ascend_test` | **44/44 Passed** |
| `npx.cmd tsx scripts/test_batch8_security_audit.ts` | Security & cross-tenant isolation against `:8011` + `ascend_test` | **22/22 Passed** |
| `npx.cmd tsx scripts/test_batch8_pathways.ts` | 3-pathway E2E journeys against `:8011` + `ascend_test` | **33/33 Passed** |
| `npx.cmd tsx scripts/test_phase6_5_2_vercel_proxy.ts` | Vercel same-origin proxy & cookie/SSRF guards | **16/16 Passed** |
| `npm.cmd audit --audit-level=moderate` | Frontend dependency vulnerability scan | **0 vulnerabilities** |
| Chrome / Playwright responsive check | `1440×900`, `1366×768`, `768×1024`, `390×844`, `375×812` | **Not Run** (`DevToolsActivePort` missing; no Playwright) |

---

## 12. Remaining Known Limitations (Excluded / Deferred)
1. **Open Food Facts bulk import:** Upstream `world.openfoodfacts.org` returned HTTP 503; adapter is unit-tested and marked `Pending Import`.
2. **ICMR-NIN IFCT 2017:** Pending written authorization; marked `Pending Authorization` on the homepage.
3. **Neon production migration & seeding:** Intentionally reserved for deployment (`alembic upgrade head` + `cli.py --target-db production --confirm-production`).
4. **Live Chrome visual check:** Requires Chrome remote debugging enabled (`DevToolsActivePort`).

---

## 13. Final Release Recommendation
**Verdict: READY WITH MINOR CONDITIONS**
All Critical and High backend, security, database, and frontend defects identified in this audit have been fixed and verified with zero test failures across `pytest` (63/63), Batch 7 (44/44), Batch 8 Security (22/22), Batch 8 Pathways (33/33), Vercel Proxy (16/16), Catalogue UI/Live Search, `tsc --noEmit`, `vite build`, and `npm audit` (0 vulnerabilities). Once you review this report and approve, the repository is ready for final Git commit/push to `main` and deployment (with Neon migration + seeding executed during the deployment stage).
