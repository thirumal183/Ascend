# ASCEND — Pre-Release Iteration 1: Deep Full-Stack Audit Report

**Date:** 2026-11-24  
**Scope:** Full-Stack Architecture, Frontend, Backend, Database, Security, AI Coach, Performance, UI/UX, and Frontend/Backend Contract Audit  
**Baseline Branch & Commit:** `main` (`bebb76c2b937e72b12088d5e2b2c406e0e88f05d`, with uncommitted Batch 1–8 working-tree changes)  
**Database Migration Head:** `254b250445d3 (head)` (`ascend_db` on PostgreSQL 18)  
**Overall Readiness Verdict:** **`NOT READY FOR RELEASE — REMEDIATION REQUIRED IN ITERATION 2`**

---

## 1. Executive Assessment

While Batches 1–8 established a clean modular FastAPI + SQLAlchemy 2.0 Async + PostgreSQL 3NF backend and a visually cohesive React 19 + TypeScript + Tailwind CSS frontend, an independent source-level audit and QA challenge pass revealed **significant functional, contract, and security gaps** that were masked by passing unit tests and frontend demo-mode fallbacks:

- **No P0 (Exploitable Critical) defects** were confirmed in the current local configuration, **provided** `SECRET_KEY` is overridden in deployment and `WorkoutPlan` is hardened before multi-user launch.
- **9 P1 (High) confirmed defects** directly impact core user journeys and multi-tenant integrity:
  1. **Unpersisted Core UI Workflows in Live Mode:** Updating profile/goals/pathway/unit-system (`GoalsProfileView`, `SettingsView`), logging workouts/sets/exercises (`WorkoutManagementView`), logging water (`DashboardView`), and clearing/loading AI Coach history (`AiCoachView`) mutate local React state only and never persist to PostgreSQL.
  2. **Missing `/api/v1/users` Endpoints:** `PUT /api/v1/users/me/profile` and `POST /api/v1/users/me/pathway` (specified in `API_SPECIFICATION.md`) do not exist in `backend/app/api/v1/api.py`.
  3. **`WorkoutPlan` IDOR & Privilege Escalation:** `WorkoutPlan` lacks `created_by_user_id`, allows any authenticated user to pass `isSystemTemplate=true`, and allows any authenticated user to delete any other user's custom workout plan.
  4. **`ActivityLevel.CompetitiveAthlete` Registration Failure (HTTP 422):** Selecting `"Competitive Athlete"` in `OnboardingWizardModal` sends an unmapped string to `POST /api/v1/auth/register`, which only accepts `"Extremely Active"`.
  5. **Sample `food-*` IDs & Phantom State in Live Mode:** `SAMPLE_FOOD_DATABASE` remains merged into `foodCatalog` after login; logging a sample item triggers a 422 UUID validation error, and `handleAddIntakeRecord` fails to roll back the optimistic `tempId` entry. Demo state (`waterIntakeMl`, `stepsToday`, `chatMessages`, and empty-array `progressHistory`/`workoutPlans`) also leaks into live accounts.
  6. **Onboarding Step 3 Custom Goals Silently Discarded:** Custom calorie/macro edits in `OnboardingWizardModal` are not sent to the backend and are overwritten on reload by `GET /auth/me`.
  7. **`calculate_scaled_nutrients` 40x Inflation on `reference_unit == "serving"`:** Backend divides `total_grams` by `food.reference_quantity` regardless of `reference_unit`, inflating nutrient totals by `grams_per_serving` whenever `reference_unit == "serving"`.
  8. **Pathway Goal Calculation Divergence:** `calculate_baseline_nutrition` diverges from `API_SPECIFICATION.md` and frontend calculations (`ATHLETIC_PERFORMANCE` +200 kcal omitted, `-450` vs `-420` deficit, `1.8` vs `2.1` g/kg protein for muscle gain, missing deficit/surplus caps and 6,000 kcal ceiling).
  9. **Insecure Default `SECRET_KEY` Without Production Startup Guard:** `Settings.SECRET_KEY` defaults to a hardcoded development string with no validator rejecting it when `ENVIRONMENT != "development"`.
- **11 P2 (Medium)** and **11 P3 (Low)** findings cover concurrency/race conditions (`rotate_refresh_token`, `upsert_set_logs`, `create_or_upsert_progress_record`), N+1 loops, defeated `pg_trgm` GIN indexes, missing rate limiting, CPU-bound Argon2id on the asyncio loop, prompt injection / API key query param in Gemini calls, `localStorage` token storage without CSP, monolithic 1,000 kB JS bundle, and UI/accessibility polish.

---

## 2. Skills Researched, Selected, Installed, and Rejected

All five upstream repositories were shallow-cloned to `%TEMP%\ascend_skill_research`, inspected for license, maintenance, `SKILL.md` compatibility, and script safety before copying selected skills into `.agents/skills/`. Existing ASCEND skills (`ascend-frontend-quality`, `ascend-nutrition-data-quality`, `ascend-product-design`, `vercel-composition-patterns`, `vercel-react-best-practices`, `web-design-guidelines`) were preserved untouched.

### 2.1 Selected & Installed Skills

| Installed Skill (`.agents/skills/`) | Upstream Repository | Source Path | License | Purpose in Audit & Remediation |
| :--- | :--- | :--- | :--- | :--- |
| `systematic-debugging` | `obra/superpowers` | `skills/systematic-debugging` | MIT | Root-cause tracing and 4-phase debugging discipline. |
| `test-driven-development` | `obra/superpowers` | `skills/test-driven-development` | MIT | Red-green-refactor regression test discipline for Iteration 2. |
| `verification-before-completion` | `obra/superpowers` | `skills/verification-before-completion` | MIT | Evidence-before-claims verification gate. |
| `requesting-code-review` | `obra/superpowers` | `skills/requesting-code-review` | MIT | Independent subagent code review workflow. |
| `improve-codebase-architecture` | `mattpocock/skills` | `skills/engineering/improve-codebase-architecture` | MIT | Module depth, seam, and technical-debt evaluation. |
| `webapp-testing` | `anthropics/skills` | `skills/webapp-testing` | Apache-2.0 | Playwright browser E2E testing patterns & `with_server.py`. |
| `security-audit` | `cloudflare/security-audit-skill` | `skills/security-audit` | MIT | Reconnaissance, coverage-led hunting, AI/LLM, auth, and data-isolation review. |
| `rcs-frontend` | `RitvikChunamari/rcs-frontend-skill` | `/` (root `SKILL.md`, `references/`, `scripts/`, `assets/`) | MIT | API/state resilience, frontend engineering, accessibility, and QA gates. |

### 2.2 Evaluated & Rejected Skills

| Repository | Rejected Skills / Components | Reason for Rejection |
| :--- | :--- | :--- |
| `obra/superpowers` | `brainstorming`, `writing-plans`, `executing-plans`, `using-git-worktrees`, `finishing-a-development-branch`, `writing-skills`, `diagnosing-superpowers`, `subagent-driven-development`, `dispatching-parallel-agents`, `receiving-code-review`, `using-superpowers` | Meta/workflow orchestration skills redundant with Antigravity built-in orchestration or out of scope for audit/remediation. |
| `mattpocock/skills` | `ask-matt`, `setup-matt-pocock-skills`, `to-spec`, `to-tickets`, `implement-spec`, `prototype`, `pr`, `retro`, `in-progress/*`, `deprecated/*`, `productivity/*` | Claude-Code-specific workflows/routers or experimental skills; `codebase-design` / `diagnosing-bugs` overlapped with `improve-codebase-architecture` and `systematic-debugging`. |
| `anthropics/skills` | `docx`, `pdf`, `pptx`, `xlsx`, `slack-gif-creator`, `canvas-design`, `mcp-builder`, `claude-api`, `doc-coauthoring`, `internal-comms`, `theme-factory`, `web-artifacts-builder`, `discernment-nudge` | Document-generation, Claude-specific API, or creative skills unrelated to ASCEND's React/FastAPI stack; `frontend-design` overlapped with `ascend-product-design` + `rcs-frontend`. |
| `cloudflare/security-audit-skill` | Full multi-agent scratch/promotion shell harness | Adapted methodology in Guidance Mode; Windows sandbox lacks POSIX no-follow descriptor isolation, so audit artifacts were written directly to workspace markdown deliverables as requested. |
| `RitvikChunamari/rcs-frontend-skill` | `.github/` workflows | Repository CI metadata excluded when copying skill into `.agents/skills/rcs-frontend/`. |

---

## 3. Frontend Audit

### 3.1 Architecture & Code Quality
- **Monolithic State Container (`src/App.tsx`, 1,102 lines):** Holds all domain state (`userAccount`, `userProfile`, `goals`, `intakeRecords`, `foodCatalog`, `progressHistory`, `workoutPlans`, `chatMessages`, `waterIntakeMl`, `stepsToday`), auth recovery, modal visibility, and persistence callbacks. Exceeds the 400-line guideline in `ascend-frontend-quality/SKILL.md:23`.
- **Large View Components:** `DashboardView.tsx` (1,445 lines) and `DietManagementView.tsx` (1,420 lines) combine chart rendering, modals, form state, and domain calculations in single files.
- **Unused Dependencies in `package.json:14-18,27`:** `@google/genai` (`^2.4.0`), `express` (`^4.21.2`), `dotenv` (`^17.2.3`), and `@types/express` have **0 imports** in `src/`.
- **Prototype Leftovers & Dead Code:** `src/services/ascendApiService.ts` (`prototypeSessionStorage.findRegisteredUser`, `saveRegisteredUser`, `FASTAPI_ENDPOINTS_SPEC`) and `src/data/mockData.ts` (`SAMPLE_FOOD_DATABASE`, `INITIAL_*`) remain tightly coupled into live mode.
- **Type Safety:** `tsc --noEmit` exits `0`, but **6 `as any` casts** exist (`src/App.tsx:543,545`, `src/components/diet/DietManagementView.tsx:1294`, `src/services/api/mappers.ts:159,160,279`), including a type mismatch between `aiCoachApi.ts:11` (`status` includes `'warning'`) and `src/types/ascend.ts:237` (omits `'warning'`).
- **Debug/Test UI Controls Exposed in Production:** `DashboardView.tsx:365-372` ("Skeletons" toggle), `DietManagementView.tsx:579-613` ("Normal / Loading / Error" state switcher), and `AiCoachView.tsx:178-188` ("Test Error State" button) render unconditionally for all users.

### 3.2 Functional Correctness (Live Mode vs Demo Mode)
- **Working End-to-End:** Login (`AuthModal`), session recovery (`GET /auth/me`), logout (`POST /auth/logout`), food search (`GET /foods/search`), custom food create/delete, meal intake create/update/delete + daily totals, progress record upsert/list, and AI coach single-turn chat (`POST /ai/chat`).
- **Broken / Unpersisted in Live Mode:**
  - `ActivityLevel.CompetitiveAthlete` fails `POST /auth/register` with HTTP 422 (`mappers.ts:81-83`).
  - `OnboardingWizardModal` custom macro/calorie edits (Step 3) are discarded on reload; registration errors are hidden because `globalBanner` is only rendered inside the authenticated shell (`App.tsx:950`).
  - `SAMPLE_FOOD_DATABASE` items (`food-*` IDs) remain in `foodCatalog` on live login and fail `POST /intake/records` with 422; optimistic intake add leaves phantom `tempId` rows on failure (`App.tsx:531-563`).
  - `GoalsProfileView` and `SettingsView` profile/goal/pathway/unit updates only mutate React state (`App.tsx:743-769,855-857`).
  - `WorkoutManagementView` never calls `workoutApi` (`createSession`, `updateSetLogs`, `createPlan`, `deletePlan`), and `GET /workouts/plans` returns `exercises: []` (`App.tsx:196,383`).
  - `DashboardView` water updates (`handleUpdateWater`) are local-only.
  - `AiCoachView` sends no `conversationId` (creating a new conversation per message), never loads history on login, and "Clear History" does not call `DELETE /ai/conversations/{id}`.
  - `ReportsView.tsx:81-83` hardcodes `activityMins` (`48`/`50`), `steps` (`8450`/`9200`), and `workoutDone: true`; `CalendarView.tsx:80,95` synthesizes workouts using `day % 2 === 0` and misaligns dates under `Mon–Sun` headers (`CalendarView.tsx:166-224`).

---

## 4. Backend Audit

### 4.1 Architecture & Async/Sync Correctness
- Clean router -> service -> SQLAlchemy ORM -> Pydantic v2 schema separation across `auth`, `foods`, `intake`, `workouts`, `progress`, `ai`, and `health`.
- **Blocking CPU Work on Event Loop:** `hash_password` and `verify_password` (`backend/app/core/security.py:32-42`) run Argon2id synchronously inside `async def` endpoints (`auth_service.py:112,202`).
- **Missing Runtime Dependency in `pyproject.toml`:** `ai_coach_service.py:12` imports `httpx` at module load, but `backend/pyproject.toml:24` places `httpx` under `[project.optional-dependencies] test` instead of `[project] dependencies` (though `backend/requirements.txt:13` includes it).
- **Inconsistent Error Envelope:** `backend/app/main.py:49-70` only handles `AscendException`, leaving FastAPI's `RequestValidationError` (422) and unhandled `SQLAlchemyError` (500) outside the `{"error": ...}` contract in `API_SPECIFICATION.md`.

### 4.2 Domain Correctness
- **Nutrition Scaling (`nutrition_service.py:295-334`):** When `food.reference_unit == "serving"`, `ratio = total_grams / food.reference_quantity` inflates nutrients by `grams_per_serving`. `edible_portion_pct` is stored on `FoodItem` and accepted in `CreateCustomFoodRequest` but ignored during scaling. `cup` is `240.0g` on backend vs `225g` on frontend.
- **Micronutrient Null vs Zero (`nutrition_service.py:470-471`):** `get_daily_intake` converts `total_fiber == 0` and `total_sodium == 0` to `None`, erasing genuine `0.0` measurements, while `IntakeRecord` omits `sugarG`, `potassiumMg`, `calciumMg`, and `ironMg`.
- **Daily Water Target Confused with Consumption (`nutrition_service.py:462-473`):** `DailyTotalsResponse.waterMl` returns `goal.water_ml` (target) rather than logged intake.
- **Pathway Calculations (`auth_service.py:51-93`):** Diverges from `API_SPECIFICATION.md` (`GoalType.ATHLETIC_PERFORMANCE` lacks `+200 kcal`; `WEIGHT_LOSS` uses `-450` vs `-420`; `MUSCLE_GAIN` protein uses `1.8` vs `2.1 g/kg`; missing `6,000 kcal` ceiling and deficit/surplus caps).
- **Progress Upsert & Summary (`progress_service.py:102-118,244-245`):** Same-date upsert overwrites omitted optional fields with request defaults (`0`/`None`); summary averages divide by `len(records)`, pulling averages down with `0`s from weight-only logs.
- **Timezone Consistency:** Rolling-window queries use server-local `date.today()` (`nutrition_service.py:582`, `workout_service.py:253`, `progress_service.py:59,217`, `ai_coach_service.py:75`) while `log_intake` uses `datetime.now(timezone.utc)`.

---

## 5. Database Audit

- **3NF & Schema:** 15 entities and `v_food_items_with_nutrients` exist at Alembic `254b250445d3 (head)`, with reversible `downgrade()`. Minor 3NF/constraint gaps: `food_items.alternate_names` uses `TEXT[]` (`nutrition.py:76-81`); `chat_messages.user_id` is a transitive dependency (`chat.py:85-96`); missing `CHECK` constraints for positive `reference_quantity`, `grams_per_serving`, and non-negative calories/telemetry.
- **Defeated Search Indexes (`nutrition_service.py:150-164`):** `FoodService.search_foods` wraps `name` and `brand_or_source` in `func.lower(...).like(...)` and queries `array_to_string(alternate_names, ' ').ilike(...)`, bypassing `idx_food_items_name_trgm`, `idx_food_items_brand_trgm`, and `ix_food_items_category`.
- **Redundant Indexes:** Duplicate B-tree indexes exist alongside `UniqueConstraint` or composite `(user_id, date_logged DESC)` indexes across 8 tables (`user_refresh_sessions`, `user_profiles`, `nutrition_goals`, `nutrients`, `exercise_set_logs`, `intake_records`, `progress_records`, `workout_sessions`, `chat_messages`).
- **Unused / Unguarded View (`views.py:3-32`):** `v_food_items_with_nutrients` divides `100.0 / f.reference_quantity` without `NULLIF(..., 0)`, aggregates all micronutrient rows before pivoting macros, and is unused by `FoodService`.
- **N+1 Queries & Pool Starvation:**
  - `WorkoutService.upsert_set_logs` (`workout_service.py:355-392`) executes $N+2$ queries in a loop.
  - `AICoachService.process_chat_message` (`ai_coach_service.py:311-347`) flushes `user_msg` and holds the DB connection/transaction open across the 10s Gemini HTTP call.
- **Dual Commit Pattern (`database.py:39-53`):** `get_db` commits on exit while services also call `await db.commit()`, causing extra `COMMIT`s on read-only `GET` requests and second implicit transactions when reading back after commit.
- **Check-Then-Insert Races:** `ProgressService.create_or_upsert_progress_record` (`progress_service.py:96-141`) and `WorkoutService.upsert_set_logs` (`357-384`) risk `IntegrityError` (500) under concurrent writes instead of using `INSERT ... ON CONFLICT DO UPDATE`.
- **Connection Pool:** `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`, `connect_args={"timeout": 3.0, "command_timeout": 3.0}`, but `pool_recycle` and PostgreSQL `statement_timeout` are unset.

---

## 6. Security Audit

- **Verified Controls:** Argon2id (`time_cost=3, memory_cost=65536, parallelism=4`), JWT `HS256` algorithm pinning, `user_id` ownership checks on `foods/custom`, `intake/records`, `workouts/sessions`, `progress/*`, `ai/conversations/*`, and `auth/sessions/*`, parameterized SQLAlchemy queries (no SQLi), and no frontend `dangerouslySetInnerHTML`/`eval` XSS sinks.
- **Confirmed Gaps:**
  - **IDOR & Privilege Escalation on `WorkoutPlan` (`P1`):** Any authenticated user can create `isSystemTemplate=true` plans and delete any user's custom plan (`workout.py:34-58`, `workouts.py:66-87`, `workout_service.py:145-192`).
  - **Insecure Default `SECRET_KEY` (`P1`):** `config.py:74-77` has a static default key with no production startup validation.
  - **No Rate Limiting (`P2`):** `main.py` and `auth.py` / `ai.py` / `foods.py` implement zero rate limiting despite `SECURITY_DESIGN.md:224-237`.
  - **Concurrent Refresh Race & Inverted Lineage (`P2`):** `rotate_refresh_token` (`auth_service.py:239-290`) lacks `with_for_update()` / atomic conditional `UPDATE`, and line 287 sets `new_session.replaced_by_token_id = session.id` instead of `session.replaced_by_token_id = new_session.id`. Multi-tab frontend `localStorage` refresh calls lack cross-tab locking, and `client.ts:171,183` lacks a `_retried` guard.
  - **Unbounded Password Length (`P2`):** `UserRegisterRequest.password` (`schemas/auth.py:51`) and `LoginRequest.password` (`schemas/auth.py:77`) have no `max_length`, enabling Argon2id CPU/memory DoS.
  - **`localStorage` Token Storage & Missing Security Headers (`P2`):** Refresh tokens are stored in `localStorage` (`client.ts:48,50`) with no CSP, `X-Content-Type-Options`, or `X-Frame-Options` headers in `index.html` or `main.py`.
  - **Wildcard CORS Methods/Headers (`P2`):** `main.py:44-45` uses `allow_methods=["*"]`, `allow_headers=["*"]` with `allow_credentials=True`; `config.py:36-37` silently falls back to localhost origins on JSON parse failure.
  - **Prompt Injection & API Key in URL (`P2`):** `ai_coach_service.py:237-246` concatenates `system_instruction` into `"role": "user"` and passes `?key=...` in the URL query string instead of `x-goog-api-key`.
  - **`jwt_version` Null Guard (`P3`, Downgraded):** `deps.py:58-59,81-82` skips epoch check if `token_jwt_version is None` (mitigated because `create_access_token` always sets it and HMAC protects tokens, but should fail closed).
  - **Debug Defaults & Timing Side-Channel (`P3`):** `DEBUG=True` default (`config.py:55`), raw exception text in `/health/db` and `decode_access_token`, and early return before `verify_password` when user email does not exist (`auth_service.py:202`).

---

## 7. Frontend / Backend Integration Audit & Traceability Matrix

| Domain / UI Component | Frontend Call / Handler | Backend Endpoint | Status | Finding / Gap |
| :--- | :--- | :--- | :--- | :--- |
| **Auth — Register** | `OnboardingWizardModal` -> `authApi.register` | `POST /api/v1/auth/register` | **Partial / Buggy** | Fails 422 on `CompetitiveAthlete`; discards Step 3 custom goals; errors invisible on landing/wizard. |
| **Auth — Login** | `AuthModal` -> `authApi.login` + `getMe` | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | **Working (with leak)** | Live login retains demo `waterIntakeMl`, `stepsToday`, `chatMessages`, and non-empty demo `progressHistory`/`workoutPlans` if backend returns `[]`. |
| **Auth — Refresh** | `client.ts` 401 interceptor -> `authApi.refresh` | `POST /api/v1/auth/refresh` | **Working (race risk)** | Single-tab queue works; multi-tab `localStorage` + non-locking backend `SELECT` can race; retry lacks `_retried` guard. |
| **Auth — Logout** | `App.tsx:handleLogout` -> `authApi.logout` | `POST /api/v1/auth/logout` | **Working** | Clears tokens and revokes sessions. |
| **Users — Profile / Pathway / Goals** | `GoalsProfileView`, `SettingsView`, `PathwaySelectionModal` | *Missing* (`PUT /users/me/profile`, `POST /users/me/pathway`) | **Unpersisted** | Local React state only; changes lost on reload. |
| **Foods — Search & Custom** | `DietManagementView` -> `nutritionApi.searchFoods` / `createCustomFood` / `deleteCustomFood` | `GET /foods/search`, `POST /foods/custom`, `DELETE /foods/custom/{id}` | **Partial / Buggy** | Sample `food-*` items stay in live `foodCatalog`; `serving` reference unit inflates 40x; `cup` 225g vs 240g. |
| **Intake — Log / Edit / Delete / Daily** | `DietManagementView` -> `nutritionApi.logIntake` / `updateIntake` / `deleteIntake` / `getDailyIntake` | `POST/PUT/DELETE /intake/records`, `GET /intake/daily` | **Partial / Buggy** | Optimistic add fails to roll back `tempId` on error; `dailyTotals.waterMl` returns target instead of logged water; `update_intake` skips scaling if `food_id` is `NULL`. |
| **Water Intake** | `DashboardView` -> `handleUpdateWater` | *None* | **Unpersisted** | Local React state only. |
| **Workouts — Plans / Sessions / Sets** | `WorkoutManagementView` -> `handleToggleExercise` / `handleUpdateExerciseSets` / `handleAddExercise` | `GET /workouts/plans`, `POST /workouts/sessions`, `PUT /workouts/sessions/{id}/sets` | **Unpersisted** | `App.tsx` only calls `listPlans()` (which omits `exercises`); session/set mutations never call `workoutApi`; `WorkoutPlan` lacks ownership. |
| **Progress — Log / List / Summary** | `ProgressTrackingView` -> `progressApi.createOrUpsertRecord` / `listRecords` | `POST /progress/records`, `GET /progress/records`, `GET /progress/summary` | **Partial** | Create/list work; `updateRecord`/`deleteRecord`/`getSummary` unused; same-date upsert overwrites omitted fields; modal inputs stale on async load. |
| **AI Coach — Chat / History / Delete** | `AiCoachView` -> `aiCoachApi.sendChatMessage` | `POST /ai/chat`, `GET /ai/conversations`, `DELETE /ai/conversations/{id}` | **Partial** | Send works (stateless, no `conversationId`); history not loaded on login; "Clear History" does not delete server conversation. |
| **Reports & Calendar** | `ReportsView`, `CalendarView` | `GET /intake/reports`, `GET /workouts/sessions` | **Prototype Leftover** | Uses single-day `intakeRecords` + hardcoded `activityMins`/`steps` (`ReportsView`) and `day % 2` synthetic workouts (`CalendarView`). |

---

## 8. AI Coach Audit

- **API Key Secrecy:** Confirmed server-side (`GEMINI_API_KEY` is never exposed to Vite `src/`). However, `ai_coach_service.py:237-240` sends it in the URL query string (`?key=...`) instead of the `x-goog-api-key` header.
- **Timeout & Fallback:** `httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS)` (`10.0s`) gracefully falls back to `generate_pathway_heuristic_response` on timeout, HTTP error, or missing key, returning `isFallback=True`.
- **Context Minimization:** Only pathway, goal type, target/logged calories & protein, weight, and latest workout title are sent (no email, password hash, or IP). However, `progressSummary` is queried (`ai_coach_service.py:98-110`) and never used.
- **Prompt Injection & Statelessness:** `system_instruction` and `prompt` are concatenated into `"role": "user"` (`ai_coach_service.py:241-246`) rather than using Gemini's `systemInstruction` field, and prior `ChatMessage` turns are never passed to Gemini.
- **Structured Insight & Medical Disclaimer:** Every response includes `medicalDisclaimer`, but `call_gemini_api` hardcodes `Calories Remaining` badge `status="optimal"` (`line 273`) regardless of calorie deficit/surplus state.
- **DB Connection Holding:** `process_chat_message` flushes `user_msg` and holds the DB connection open during the up-to-10s Gemini HTTP call (`lines 311-347`).

---

## 9. Performance Assessment

- **Frontend Bundle (`vite build`):** `dist/assets/index-Dpmewj55.js` is **1,000.35 kB** raw (**266.61 kB** gzipped); CSS is **114.46 kB** (**15.94 kB** gzipped). Built in 3.10s with Vite 8.3.8 warning on chunk size > 500 kB and legacy `__dirname` in `vite.config.ts:11`.
- **Code Splitting Opportunity:** `src/App.tsx:13-24` eagerly imports all 9 views (including Recharts-heavy `DashboardView`, `ProgressTrackingView`, `ReportsView`, `CalendarView`, `AiCoachView`). Switching auxiliary tabs to `React.lazy()` + `<Suspense>` will cut initial JS payload substantially.
- **State Serialization Overhead:** `App.tsx:229-257` runs synchronous `JSON.stringify` into `localStorage` on every state mutation across all arrays.
- **Backend & Database Bottlenecks:**
  - Synchronous Argon2id (`64 MiB`, `time_cost=3`) blocks the asyncio event loop on login/register.
  - `FoodService.search_foods` performs sequential scans due to `func.lower(...)` defeating `pg_trgm` GIN indexes.
  - `WorkoutService.upsert_set_logs` executes $N+2$ queries per save.
  - `AICoachService.process_chat_message` holds DB connections open across external HTTP calls.

---

## 10. UI/UX Assessment

- **Strengths:** Cohesive "Kinetic Vitality" aesthetic (`ascend-product-design`), pathway-specific emerald/sky/amber accents, `tabular-nums` metric alignment, clear AI Coach privacy banner + model provenance badge (`Gemini 2.5 Flash` vs `Pathway Heuristic Fallback`) + medical disclaimer.
- **Weaknesses:**
  - **Silent Registration Failure & Unprotected Double-Submit:** `OnboardingWizardModal` lacks loading/disabled submit state and error banner rendering.
  - **Calendar Grid Misalignment:** `CalendarView.tsx:166-224` renders `Mon–Sun` headers without leading weekday offset cells, placing Day 1 under Monday regardless of month.
  - **Empty Workout Plan Crash Risk:** `WorkoutManagementView.tsx:54,83` assumes `workoutPlans.length > 0`.
  - **Modal Accessibility:** Modals handle `Escape` and backdrop click, but lack focus trapping (`Tab`) and focus restoration on close.
  - **Debug UI Leakage:** Skeleton/Loading/Error test buttons in `DashboardView`, `DietManagementView`, and `AiCoachView` appear for regular users.
  - **CSV Export:** `ReportsView.tsx:118-129` uses `data:text/csv` URI instead of `Blob` + formula-injection neutralization.

---

## 11. Confirmed Bugs & Risks (Prioritised Registry)

### P1 — High Severity Confirmed Defects

| ID | Title | File & Line References | Root Cause & Impact | Recommended Fix | Regression Test | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUD-P1-01** | `WorkoutPlan` IDOR & System Template Privilege Escalation | `backend/app/models/workout.py:34-58`, `schemas/workout.py:80`, `endpoints/workouts.py:32-87`, `services/workout_service.py:86-192` | `WorkoutPlan` has no `created_by_user_id`; trusts client `isSystemTemplate`; `delete_workout_plan` has no owner check. Any user can inject global templates or delete others' plans. | Add `created_by_user_id` FK, ignore client `isSystemTemplate`, scope list/get/delete to owner or system template. | Cross-user plan delete -> 403/404; `isSystemTemplate=true` forced `false`. | **100%** |
| **AUD-P1-02** | `ActivityLevel.CompetitiveAthlete` Fails Registration (HTTP 422) | `src/types/ascend.ts:43`, `src/services/api/mappers.ts:81-83`, `backend/app/models/enums.py:38-43`, `OnboardingWizardModal.tsx:459-461` | Mapper passes `'Competitive Athlete'` verbatim while backend enum requires `'Extremely Active'`. Registration fails 422. | Map `CompetitiveAthlete` -> `'Extremely Active'` in `mapFrontendActivityLevelToBackend`. | Register via mapper with `CompetitiveAthlete` -> 201. | **100%** |
| **AUD-P1-03** | Sample `food-*` IDs in Live Mode, Unrolled-Back Optimistic Add & Demo State Leak | `src/App.tsx:103-125,178-223,352-412,531-563`, `backend/app/schemas/nutrition.py:142` | `foodCatalog` keeps `SAMPLE_FOOD_DATABASE` (`food-*` non-UUIDs) after login; failed `logIntake` leaves `tempId` in state; live login fails to reset `waterIntakeMl`, `stepsToday`, `chatMessages`, and empty arrays. | Replace `foodCatalog` in live mode; roll back `tempId` on catch; reset all domain state before hydrating live account. | Unit/integration test verifying live login clears demo arrays and rolls back failed `logIntake`. | **100%** |
| **AUD-P1-04** | Missing `/users/me/profile` & `/users/me/pathway` + Unpersisted Profile/Goal/Workout/Water/AI CRUD | `backend/app/api/v1/api.py:1-25`, `src/App.tsx:196,383,676-769,850-857`, `WorkoutManagementView.tsx:99-181`, `AiCoachView.tsx:131-176` | No `/users` router exists; `WorkoutManagementView`, `GoalsProfileView`, `SettingsView`, water tracking, and `AiCoachView` history/delete never call backend APIs; `listPlans()` returns `exercises: []`. | Implement `/users/me/profile` & `/users/me/pathway`, wire `workoutApi`, `aiCoachApi` conversations, `progressApi` edit/delete, and fetch plan details. | E2E persistence test across page reload for profile, goals, workouts, water, and AI chat history. | **100%** |
| **AUD-P1-05** | Onboarding Step 3 Custom Goals Discarded & Registration Errors Hidden | `src/components/auth/OnboardingWizardModal.tsx:50-73,212-232,540-662`, `src/App.tsx:438-500,872-950` | `UserRegisterRequest` ignores custom macro edits; `globalBanner` is unrendered while logged out; wizard lacks `isSubmitting`/error state and stale-props sync on `pathway`. | Display errors & loading state in `OnboardingWizardModal`, sync pathway defaults on open, persist custom goals after register. | Test wizard error display, double-submit guard, and custom macro persistence. | **100%** |
| **AUD-P1-06** | `calculate_scaled_nutrients` 40x Inflation on `reference_unit == "serving"` | `backend/app/services/nutrition_service.py:295-334`, `backend/app/schemas/nutrition.py:97` | Divides `total_grams` by `reference_quantity` even when `reference_unit == "serving"` (inflating by `grams_per_serving`). Also ignores `edible_portion_pct`. | Compute `base_grams = reference_quantity * grams_per_serving` when `reference_unit == "serving"`. | Pytest logging 1 serving of a `reference_unit="serving"` custom food. | **100%** |
| **AUD-P1-07** | Pathway Goal Calculations Diverge from Spec & Frontend | `backend/app/services/auth_service.py:51-93,139-140`, `docs/backend/API_SPECIFICATION.md:203-212` | `ATHLETIC_PERFORMANCE` lacks `+200 kcal`; `WEIGHT_LOSS` uses `-450` vs `-420`; `MUSCLE_GAIN` protein `1.8` vs `2.1 g/kg`; missing safety caps/ceiling. | Extract `NutritionGoalCalculator` matching `API_SPECIFICATION.md` formulas and safety bounds. | Pytest verifying all 3 pathways + min/max calorie bounds. | **100%** |
| **AUD-P1-08** | Insecure Default `SECRET_KEY` Without Production Startup Guard | `backend/app/core/config.py:74-77` | Static default `SECRET_KEY` allowed in non-development environments; allows JWT forgery if unset. | Add `@model_validator(mode="after")` rejecting default/short `SECRET_KEY` when `ENVIRONMENT != "development"`. | Unit test instantiating `Settings(ENVIRONMENT="production")` without `SECRET_KEY` -> `ValueError`. | **100%** |

### P2 — Medium Severity Confirmed Defects & Risks

| ID | Title | File & Line References | Root Cause & Impact | Recommended Fix | Regression Test | Confidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUD-P2-01** | Concurrent Refresh Token Race & Inverted `replaced_by_token_id` | `backend/app/services/auth_service.py:239-290`, `src/services/api/client.ts:75-190` | Plain `SELECT` without `with_for_update()` allows concurrent refresh minting; `new_session.replaced_by_token_id = session.id` is inverted; `client.ts` retry lacks `_retried` guard. | Add `.with_for_update()` (or atomic `UPDATE ... RETURNING`), set `session.replaced_by_token_id = new_session.id`, add `_retried` flag in `client.ts`. | Asyncio concurrent `/auth/refresh` test + lineage assertion. | **100%** |
| **AUD-P2-02** | `FoodService.search_foods` Defeats `pg_trgm` GIN Indexes | `backend/app/services/nutrition_service.py:150-164`, `alembic/versions/254b250445d3_*.py:320-321` | `func.lower(...).like(...)` and unindexed `array_to_string(...)` cause sequential scans on `food_items`. | Use `.ilike(term)` directly for GIN trigram index usage and index aliases / `lower(category)`. | `EXPLAIN ANALYZE` or query-plan check verifying index scan. | **100%** |
| **AUD-P2-03** | N+1 Query Loop & Race in `WorkoutService.upsert_set_logs` + Check-Then-Insert in `ProgressService` | `backend/app/services/workout_service.py:355-392`, `services/progress_service.py:96-141` | Loop executes $N+2$ queries; concurrent upserts on unique keys raise unhandled `IntegrityError` (500). Also `upsert_set_logs` lacks `exerciseItemId` validation. | Use PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` and validate `exerciseItemId`s. | Concurrent upsert test + batch set-log query-count assertion. | **100%** |
| **AUD-P2-04** | Missing Rate Limiting & Unbounded Password Length (Argon2id DoS) | `backend/app/main.py`, `endpoints/auth.py`, `schemas/auth.py:51,77` | Zero rate limiting on `/auth/*`, `/ai/chat`, `/foods/search`; no `max_length` on passwords passed to 64 MiB Argon2id. | Add rate limiting (`slowapi`/limiter) and `max_length=128` on password fields. | Request with 10,000-char password -> 422; burst auth requests -> 429. | **100%** |
| **AUD-P2-05** | CPU-Bound Argon2id Blocking Asyncio Event Loop | `backend/app/core/security.py:32-42`, `services/auth_service.py:112,202` | Synchronous Argon2id hash/verify runs directly on the FastAPI event loop. | Offload via `await asyncio.to_thread(...)`. | Non-blocking concurrent health check during login load test. | **100%** |
| **AUD-P2-06** | `AICoachService` Holds DB Connection During 10s HTTP Call, Prompt Injection & API Key in URL | `backend/app/services/ai_coach_service.py:227-252,311-347` | DB transaction held open across `httpx` call; `system_instruction` concatenated into `"role": "user"`; `?key=` in URL; stateless single-turn Gemini calls. | Commit user message before HTTP call, use Gemini `systemInstruction`, pass `x-goog-api-key` header, include recent history. | Unit test verifying `x-goog-api-key` header, `systemInstruction` payload, and DB session state. | **100%** |
| **AUD-P2-07** | `localStorage` Token Storage Without CSP / Security Headers & Wildcard CORS | `src/services/api/client.ts:22-64`, `index.html`, `backend/app/main.py:39-46` | 7-day refresh token in `localStorage`; no CSP/security headers; `allow_methods=["*"]`, `allow_headers=["*"]` with `allow_credentials=True`. | Move refresh token to `HttpOnly; Secure; SameSite=Lax` cookie, add CSP/security headers, restrict CORS methods/headers. | Security header + CORS preflight assertions. | **100%** |
| **AUD-P2-08** | Reports & Calendar Use Hardcoded/Synthetic Data Instead of Backend APIs | `src/components/reports/ReportsView.tsx:42-86`, `src/components/calendar/CalendarView.tsx:68-98,166-224` | `ReportsView` hardcodes `activityMins`/`steps`/`workoutDone`; `CalendarView` uses `day % 2` and lacks weekday offset cells; `getIntakeReports` unused. | Wire `nutritionApi.getIntakeReports` and `workoutApi.listSessions`, and add calendar weekday alignment offset. | Component test verifying calendar weekday alignment and real report totals. | **100%** |
| **AUD-P2-09** | `ProgressService` Overwrites Omitted Fields on Upsert, Skews Averages, and `DailyTotals.waterMl` Semantics | `backend/app/services/progress_service.py:102-118,244-245`, `services/nutrition_service.py:462-473` | Same-date upsert resets omitted fields to `0`/`None`; averages divide by total rows; `DailyTotalsResponse.waterMl` returns target instead of logged water; `cup` 240g vs 225g. | Use `payload.model_fields_set` on upsert, average logged days only, track logged water, unify `cup` to `240g`. | Pytest for partial same-date progress upsert without wiping calories/steps. | **100%** |
| **AUD-P2-10** | Missing Global `RequestValidationError`/`SQLAlchemyError` Envelopes & `httpx` Missing in `pyproject.toml` | `backend/app/main.py:49-70`, `backend/pyproject.toml:7-25`, `services/nutrition_service.py:470-471,505-525` | 422/500 responses bypass `{"error": ...}` envelope; `httpx` only in `[test]` extras in `pyproject.toml`; `0.0` fiber/sodium coerced to `None`; `update_intake` skips scaling when `food_id` is `NULL`. | Add global exception handlers, move `httpx` to `[project] dependencies`, track `has_measured_*` flags, scale snapshot proportionally when `food_id` is `NULL`. | Pytest for 422 error envelope, `0.0` fiber preservation, and deleted-food intake scaling. | **100%** |
| **AUD-P2-11** | Monolithic Frontend Bundle (1,000 kB JS), Eager Imports & Sync `localStorage` Serialization | `src/App.tsx:13-24,229-257`, `package.json:14-18` | All 9 views imported eagerly; `JSON.stringify` runs on every state change; unused `@google/genai`, `express`, `dotenv` in `package.json`. | Lazy-load auxiliary views (`React.lazy`), remove unused deps, debounce/scope `localStorage` persistence. | `vite build` chunk size check (< 500 kB main chunk). | **100%** |

### P3 — Low Severity Confirmed Defects & Polish

| ID | Title | File & Line References | Summary |
| :--- | :--- | :--- | :--- |
| **AUD-P3-01** | `jwt_version` Null Check Fail-Open | `backend/app/api/v1/deps.py:58-59,81-82` | Downgraded from High: `create_access_token` always sets `jwt_version` and HMAC protects tokens, but should fail closed if `None`. |
| **AUD-P3-02** | Unused `authorization` Header & `isCurrent` Always `False` | `backend/app/api/v1/endpoints/auth.py:150-156`, `services/auth_service.py:334-362` | `SessionItem.isCurrent` is always `False`; unused header parameter. |
| **AUD-P3-03** | Duplicate B-Tree Indexes & Unused `v_food_items_with_nutrients` | `backend/app/models/*.py`, `backend/app/models/views.py:3-32` | Redundant indexes on 8 tables; view lacks `NULLIF(..., 0)` guard and is unused. |
| **AUD-P3-04** | Dual Commit Pattern in `get_db` vs Services | `backend/app/core/database.py:39-53` | `get_db` commits even on read-only `GET` endpoints; services also call `db.commit()`. |
| **AUD-P3-05** | Missing Domain `CHECK` Constraints & `pool_recycle` / `statement_timeout` | `backend/app/models/nutrition.py`, `workout.py`, `progress.py`, `core/database.py:21-28` | Missing `> 0` / `>= 0` DB check constraints; `pool_recycle` and server `statement_timeout` unset. |
| **AUD-P3-06** | `DEBUG=True` Default, Raw Exception Strings & Login Timing Side-Channel | `backend/app/core/config.py:55`, `endpoints/health.py:56`, `core/security.py:96`, `services/auth_service.py:202` | `DEBUG` defaults to `True`; raw exception strings returned; early return before Argon2id when email unknown. |
| **AUD-P3-07** | `WorkoutManagementView` Empty-Array Crash Risk & Stale Modal Drafts | `src/components/workouts/WorkoutManagementView.tsx:54,83`, `ProgressTrackingView.tsx:56-67`, `GoalsProfileView.tsx:65-66` | Assumes `workoutPlans.length > 0`; modal inputs don't sync on async hydration. |
| **AUD-P3-08** | Modal Focus Trapping, Debug Buttons in Production UI & `AuthModal` Copy | `src/components/ui/Modal.tsx`, `DashboardView.tsx:365-372`, `DietManagementView.tsx:579-613`, `AiCoachView.tsx:178-188`, `AuthModal.tsx:249-251,377,427-432` | Missing focus trap/restore; dev state-tester buttons visible; `"Min. 6 characters"` placeholder vs 8-char rule. |
| **AUD-P3-09** | 6 `as any` Casts & `CoachMetricItem.status` Type Divergence | `src/App.tsx:543,545`, `DietManagementView.tsx:1294`, `mappers.ts:159,160,279`, `types/ascend.ts:237` | Add `'warning'` to `CoachMetricItem` in `ascend.ts` and type meal/unit/category unions cleanly. |
| **AUD-P3-10** | CSV Export `data:` URI & Formula Injection Risk | `src/components/reports/ReportsView.tsx:118-129` | Replace `data:text/csv` with `Blob` + `URL.createObjectURL` and prefix cells starting with `=`, `+`, `-`, `@`. |
| **AUD-P3-11** | `test_batch8_pathways.ts` Counter Denominator Bug (`33/36`) & `vite.config.ts` `__dirname` Warning | `scripts/test_batch8_pathways.ts:218`, `vite.config.ts:11` | Fix `passedTests` increment/denominator in script; use `import.meta.dirname` in `vite.config.ts`. |

---

## 12. Recommended Improvements (Non-Defect Enhancements)

1. **Decompose `App.tsx`, `DashboardView.tsx`, and `DietManagementView.tsx`** into domain contexts/hooks (`useAuthSession`, `useNutritionLedger`, `useWorkoutTracker`) and sub-components under 400 lines.
2. **Add Frontend Unit/Component Test Suite (Vitest + React Testing Library)** to test `mappers.ts`, `client.ts` refresh queueing, and form/modal error states without needing a live server.
3. **Add `pip-audit` & `bandit` to Backend CI** alongside `npm audit`.
4. **Upgrade AI Coach to True Multi-Turn + Dynamic Structured Insights** by passing recent `ChatMessage` history and requesting structured JSON insight blocks from Gemini.

---

## 13. Test Results & Verification Limitations

| Check | Command | Outcome | Notes / Limitations |
| :--- | :--- | :--- | :--- |
| **Backend Pytest Suite** | `python -m pytest backend/tests -v` | **47/47 PASSED** (9.12s) | Executed against live local PostgreSQL (`ascend_db`) with `BypassSandbox: true` (loopback socket requirement on Windows). |
| **Batch 7 Integration** | `npx.cmd tsx scripts/test_batch7_integration.ts` | **44/44 PASSED** | Executed against live FastAPI daemon (`127.0.0.1:8000`) with `BypassSandbox: true`. |
| **Batch 8 Security Audit** | `npx.cmd tsx scripts/test_batch8_security_audit.ts` | **22/22 PASSED** | Verified password min-length, token rotation/reuse detection, and cross-user isolation on custom foods, intake, workout sessions, progress, and AI conversations (did not test `WorkoutPlan` cross-user delete). |
| **Batch 8 Pathways** | `npx.cmd tsx scripts/test_batch8_pathways.ts` | **33 assertions PASSED** | Script exited `0`; printed `33/36` due to hardcoded `PATHWAYS.length * 12` denominator (`AUD-P3-11`). |
| **Frontend Typecheck** | `npm.cmd run lint` (`tsc --noEmit`) | **PASSED (0 errors)** | Clean compilation. |
| **Production Build** | `npm.cmd run build` (`vite build`) | **PASSED (0 errors)** | `dist/assets/index-Dpmewj55.js` = `1,000.35 kB` (gzip `266.61 kB`); Vite warns on > 500 kB chunk & `__dirname`. |
| **NPM Dependency Audit** | `npm.cmd audit` | **0 vulnerabilities** | 189 prod + 43 dev packages checked. |
| **Python Security Tools** | `pip-audit`, `bandit` | **Not Run** | Neither tool is installed in the local Python 3.13 environment. |
| **Headless Browser E2E** | Playwright / Chrome DevTools | **Not Run (Blocked)** | Windows sandbox loopback socket boundary prevents launching automated headless Chrome over CDP ports (`9222`/`9333`). |

---

## 14. Prioritised Remediation Roadmap & 15. Exact Files Likely to Change

See the companion **[ASCEND_ITERATION_1_REMEDIATION_ROADMAP.md](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/ASCEND_ITERATION_1_REMEDIATION_ROADMAP.md)** for the sequenced Iteration 2 execution plan, acceptance criteria, and exact file inventory.

---

## 16. Remaining Architectural Concerns

1. **Dual Persistence Paradigm (`prototypeSessionStorage` vs PostgreSQL):** Demo mode and live mode currently share mutable React state in `App.tsx`, which caused demo data leaks (`AUD-P1-03`). Iteration 2 must strictly isolate demo state from authenticated live state.
2. **Timezone-Aware Day Boundaries:** Mixing UTC timestamps (`time_logged`) with server-local `date.today()` (`AUD-P2-09`) will cause off-by-one-day diary rollups for non-server-timezone users until user timezone or explicit client `dateIso` parameters are standardized across all rolling-window endpoints.
3. **Production Deployment Hardening:** Before public hosting, `localStorage` refresh tokens (`AUD-P2-07`), missing rate limiting (`AUD-P2-04`), and `SECRET_KEY` startup validation (`AUD-P1-08`) must be resolved.
