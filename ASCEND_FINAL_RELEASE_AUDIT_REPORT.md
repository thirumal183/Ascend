# ASCEND — Final Release Gate & Production Audit Report

**Date:** 2026-11-25  
**Target Architecture:** Vercel (Frontend + `/api/*` Proxy) → Render Free (FastAPI) → Neon Free (PostgreSQL)  
**Target Branch:** `main` (uncommitted working tree; no commit, push, or deployment performed)  

---

## 1. Food Catalogue & Nutrition Data Audit

### Provenance & Verification Findings
- **Frontend Sample Catalogue ([mockData.ts](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/data/mockData.ts)):**
  - Entries carry explicit `sourceProvenance` metadata (`sourceName`, `sourceId`, `verificationStatus`, `licenseType`), `preparationState` (`raw`, `cooked`, `composite_dish`), `gramsPerServing`, and `ediblePortionPct`.
  - USDA single-ingredient foods are attributed to `USDA FoodData Central` with `Public Domain (CC0)`.
  - Indian culinary items are attributed either to `ICMR-NIN Indian Food Composition Tables (Standard Reference Entry)` or `ASCEND Indian Culinary Composition Model` with `licenseType: 'Curated Prototype / Demo'` (respecting ICMR-NIN IFCT licensing boundaries).
- **Live PostgreSQL `food_items` Table (Condition Found):**
  - Read-only inspection of the live Neon `food_items` table (`is_custom_user_food = false`) found **60 public rows**, all created by `pytest` runs (`30x Brown Basmati Rice <hex>` with `USDA Reference` and `30x Greek Yogurt 0% Fat <hex>` with `ASCEND High Protein`).
  - There is currently no production seed script in `backend/` populating the curated catalog into PostgreSQL.
- **Missing Micronutrients & Snapshot Immutability:**
  - Verified in [nutrition_service.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/services/nutrition_service.py#L75-L95): unmeasured micronutrients (`FIBTG`, `SUGAR`, `NA`, `K`, `CA`, `FE`) remain `None` (`null` in JSON), never coerced to `0`.
  - Verified in [nutrition_service.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/services/nutrition_service.py#L381-L442): `IntakeService.log_intake` freezes `food_name`, `category`, and `computed_*` nutrient columns at log time so historical diary entries remain immutable.
  - Verified in [nutrition_service.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/services/nutrition_service.py#L140-L199): custom foods (`is_custom_user_food = true`) are strictly scoped to `created_by_user_id`.

### Nutrition Calculation Verification
- **Backend ([nutrition_calculator.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/services/nutrition_calculator.py)):**
  - Implements Mifflin-St Jeor BMR (`+5` male, `-161` female, `-78` unspecified), TDEE multipliers (`1.2` to `1.9`), pathway/goal adjustments (`-420` weight loss, `+350` muscle gain, `+200` athletic performance), safety caps (`min(25%, 750)` deficit, `min(15%, 500)` surplus), caloric floors (`1200` female, `1500` male/unspecified), protein bounds (`1.2–2.5 g/kg`), `25%` fat, remainder carbs, and `36 ml/kg` hydration (`+450 ml` for Athlete Performance).
- **Frontend ([ascendApiService.ts](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/services/ascendApiService.ts#L281-L353)):**
  - Uses the same Mifflin-St Jeor BMR, TDEE multipliers, calorie adjustments, and `36 ml/kg` (`+450 ml` Athlete) hydration formula.
  - Minor non-blocking difference: frontend preview uses `28%` fat for General/Muscle Gain (`25%` Athlete) and a `1400 kcal` floor without the deficit/surplus cap, whereas backend uses `25%` fat across all pathways with `1200`/`1500 kcal` floors and safety caps.
- **Portion Scaling:** Verified in both `FoodService` / `IntakeService` and `calculateScaledNutrients`; direct reference-unit matches scale linearly without inflation, and missing micronutrients stay `null`.

---

## 2. Backend, API & Security Audit

- **Authentication & Sessions ([auth.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/api/v1/endpoints/auth.py)):**
  - Argon2id password hashing, JWT HS256 access tokens (stored in JS memory only, never `localStorage`), opaque refresh tokens hashed in `refresh_sessions`, rotation with reuse detection (revoking all user sessions on replay).
  - HttpOnly refresh cookie (`ascend_refresh_token`, `Path=/api/v1/auth`, `SameSite=Lax`, `Secure=True` when `ENVIRONMENT != 'development'`).
  - CSRF protection (`X-Requested-With` or `Authorization: Bearer` required when authenticating via refresh cookie).
  - Rate limiting and `MAX_REQUEST_BODY_BYTES=1048576` payload size guard active in [main.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/main.py).
- **Cross-Tenant Isolation:**
  - Verified across custom foods, meal intake, water intake, workout plans/sessions/set logs, progress records, and AI coach conversations (22/22 Batch 8 security tests pass).
- **AI Coach ([ai_coach_service.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/services/ai_coach_service.py#L219-L250)):**
  - `systemInstruction` sends only pathway, weight, calorie/protein targets, logged totals, and recent workout summary — no email, password, or full name is transmitted to Gemini.
  - Falls back cleanly to deterministic pathway-aware heuristics when `GEMINI_API_KEY` is absent or times out, and tags `isMockResponse` explicitly.
  - **Limitation:** Live Gemini API calls were not executed in this audit (verified via unit/mocked tests and heuristic fallback tests).

---

## 3. PostgreSQL & Alembic Migration Audit

- **Migrations:** Alembic head is `d4e5f6a7b8c9` (`d4e5f6a7b8c9_phase6_5_water_and_exercise_owner.py`), matching the live Neon PostgreSQL `alembic current` output (`d4e5f6a7b8c9 (head)`).
- **Schema & Neon Compatibility ([config.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/core/config.py#L119-L150), [database.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/core/database.py)):**
  - `async_database_uri` strips `sslmode` / `channel_binding` query params incompatible with `asyncpg`, while `async_connect_args` enables `ssl="require"` and `statement_cache_size=0` for `-pooler` Neon endpoints.
  - Async session lifecycle commits on success, rolls back on exception, and disposes cleanly on shutdown.
- **Condition Found:** Live Neon `workout_plans` (`is_system_template = true`) currently holds 58 test-created template rows from `pytest` runs (`Protected System Template <hex>`). Production launch should seed clean pathway templates and remove test-generated public rows.

---

## 4. Vercel + Render + Neon Deployment Audit

- **Vercel Proxy ([vercel.json](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/vercel.json), [api/proxy.ts](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/api/proxy.ts)):**
  - Routes `/api/:path*` to `/api/proxy?__ascend_path=:path*` and SPA fallback to `/index.html`.
  - Validates `RENDER_BACKEND_URL` (HTTPS or local HTTP only, no credentials), blocks path traversal / open-proxy tricks, strips `__ascend_path` while preserving query params, ignores spoofed `x-forwarded-for` in favor of `x-vercel-forwarded-for`, and preserves multiple `Set-Cookie` headers.
  - Frontend [client.ts](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/services/api/client.ts#L33-L52) defaults to `/api/v1` in production browser builds so cookies remain same-origin.
- **Render ([render.yaml](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/render.yaml)):**
  - Configured for `plan: free`, `rootDir: backend`, `alembic upgrade head && uvicorn app.main:create_application --factory --host 0.0.0.0 --port $PORT`, `healthCheckPath: /api/v1/health`, `ENVIRONMENT=production`, `DEBUG=False`, `DATABASE_POOL_SIZE=5`, `DATABASE_MAX_OVERFLOW=5`.
- **Environment Templates:**
  - Fixed stale `Cloudflare Pages` comment in [backend/.env.example](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/.env.example#L48) and clarified Vercel `RENDER_BACKEND_URL` vs `VITE_API_BASE_URL` in [.env.example](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/.env.example#L7-L11).

---

## 5. Frontend & UX Audit

- Inspected landing page, startup intro, auth/onboarding modals, all three pathway dashboards, Diet, Workouts, Progress, Goals, AI Coach, Calendar, Reports, and Settings.
- Verified in headless Chromium (Desktop `1440×900`, Tablet `768×1024`, Mobile `375×812`): `0` console errors, `0` horizontal overflow, `localStorage` contains zero access/refresh tokens.

---

## 6. Verification Results (Executed After Final Edit)

| Suite / Command | Result | Exact Count / Output |
| :--- | :--- | :--- |
| `npm.cmd run lint` (`tsc --noEmit`) | **PASSED** | `0` errors |
| `npm.cmd run build` (`vite build`) | **PASSED** | Clean in `2.47s` |
| `npm.cmd audit --audit-level=moderate` | **PASSED** | `0` vulnerabilities |
| `python -m pytest tests/ -v` | **PASSED** | **58 / 58** in `10.92s` |
| `npx.cmd tsx scripts/test_batch7_integration.ts` | **PASSED** | **44 / 44** |
| `npx.cmd tsx scripts/test_batch8_security_audit.ts` | **PASSED** | **22 / 22** |
| `npx.cmd tsx scripts/test_batch8_pathways.ts` | **PASSED** | **33 / 33** |
| `npx.cmd tsx scripts/test_phase6_5_2_vercel_proxy.ts` | **PASSED** | **16 / 16** |
| **Total Automated Checks** | **PASSED** | **173 / 173** |

---

## 7. Changes Made During This Audit

1. [.env.example](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/.env.example#L7-L11) — Clarified production `/api/v1` same-origin proxy usage and server-side `RENDER_BACKEND_URL`.
2. [backend/.env.example](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/.env.example#L48) — Replaced stale Cloudflare Pages example origin with Vercel origin example.
