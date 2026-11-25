# ASCEND — Chronological Engineering & Release History

This document consolidates the complete engineering evolution of **ASCEND** from initial frontend prototype through full-stack backend implementation, security hardening, visual identity redesign, and pre-deployment release verification.

---

## Milestone Timeline

### Initial Foundation (`f262657`, `878d494`, `bab276e`, `03bfcb1`)
- Established the React 19 + TypeScript + Vite + Tailwind CSS SPA with three pathways (*General Nutrition & Diet*, *Athlete Performance*, *Weight Gain & Muscle Gain*).
- Implemented initial nutrition intelligence, `ascend-nutrition-data-quality` / `ascend-product-design` / `ascend-frontend-quality` skills, and curated `SAMPLE_FOOD_DATABASE` provenance metadata.

### Phase 1 & Phase 2 — Frontend Technical Audit & Remediation (`ee579c9`, `bebb76c`)
- **Objective:** Eliminate prototype bugs, hardcoded dates, and synthetic mock calculations in the frontend.
- **Key Fixes (`CLAUDE_PROJECT_AUDIT.md`, `CLAUDE_FIX_REPORT.md`):**
  - `BUG-01` / `BUG-02` / `BUG-02B`: Built timezone-safe `dateUtils.ts` (`getLocalDateIso()`), connected Dashboard date navigation to `dayIntakeRecords`, and isolated today's food diary/reports ledger from yesterday's records.
  - `BUG-03` / `BUG-04`: Added bidirectional Imperial/Metric unit conversion in onboarding and persisted `activeTab` across refreshes.
  - `MOCK-01` / `MOCK-02`: Replaced modulo calendar math and static report trends with real `intakeRecords` hash lookups and rolling 7-day adherence calculations.
  - `INC-01` / `INC-02` / `INC-03`: Added `biologicalSex` (`+5` / `-161` / `-78`) to Mifflin-St Jeor BMR, added set-by-set `ExerciseSetLog` tracking with rest timer, and fixed 28-day progress filtering.
  - `DEBT-01` / `DEV-01`: Removed dead 1,494-line `AuthOnboardingFlow.tsx` and guarded `import.meta.env` for Node/tsx runners.
- **Verification:** `tsc --noEmit` (0 errors), `vite build` clean (2.7s), Node integration checks passed (`testPhase2Comprehensive.ts`, `verifyPhase2Fixes.mjs`). Merged to `main` in `bebb76c`.

### Phase 3 — Backend Architecture & Relational Database Design
- **Objective:** Design a normalized PostgreSQL 16+ backend and REST API contract (`docs/architecture/`).
- **Key Decisions:**
  - Adopted **Pure 3NF** (`nutrients` + `food_nutrients` associative bridge) over hardcoded macro columns, preserving `null` for unmeasured micronutrients.
  - Designed **immutable nutrient snapshots** on `intake_records` so food catalog edits never corrupt historical meal logs.
  - Designed dual-token auth (Argon2id + HS256 JWT + SHA-256 hashed rotating refresh sessions with `replaced_by_token_id` lineage and `jwt_version` global revocation).

### Phase 4 (Batches 1–8) — Full-Stack Implementation (`a43ebb1`)
- **Batch 1 (Foundation):** FastAPI app factory, Pydantic `BaseSettings`, async SQLAlchemy 2.0 + `asyncpg` pool, and health endpoints.
- **Batch 2 (Models & Initial Migration):** Implemented 15 relational entities + `v_food_items_with_nutrients` view; generated initial Alembic migration `254b250445d3`.
- **Batch 3 (Auth & Sessions):** Implemented `auth_service.py` and `/api/v1/auth/*` (Argon2id, JWT, refresh rotation, reuse detection, session list/revocation).
- **Batch 4 (Nutrition APIs):** Implemented `foods.py` and `intake.py` with `pg_trgm` search, custom foods, portion scaling, and frozen intake snapshots.
- **Batch 5 (Workouts & Progress):** Implemented `workouts.py` and `progress.py` (plans, sessions, set logs, 28-day/365-day biometrics).
- **Batch 6 (AI Coach):** Implemented `ai_coach_service.py` and `ai.py` (Gemini API integration + deterministic pathway heuristic fallback + conversation persistence).
- **Batch 7 (Frontend-Backend Integration):** Connected React SPA via `src/services/api/*` and `mappers.ts`. Verified **44/44** integration tests (`scripts/test_batch7_integration.ts`).
- **Batch 8 (Security & Multi-Pathway Verification):** Verified **22/22** security/isolation tests (`test_batch8_security_audit.ts`) and **33/33** multi-pathway journey tests (`test_batch8_pathways.ts`).

### Phase 5 (Iterations 1 & 2) — Deep Full-Stack Audit & Remediation (`a43ebb1`)
- **Iteration 1 Audit:** Identified 9 P1, 11 P2, and 11 P3 gaps masked by demo fallbacks (missing `/users/me/*` endpoints, `WorkoutPlan` missing owner FK, `CompetitiveAthlete` 422 mapping bug, `serving` 40x scaling inflation, missing `SECRET_KEY` production validator, blocking Argon2id on event loop, missing rate limiter, monolithic JS bundle).
- **Iteration 2 Remediation:**
  - Added migration `9c4f8a2b1d7e` (`workout_plans.created_by_user_id`), `/api/v1/users/me/*` endpoints, `nutrition_calculator.py`, `rate_limit.py`, `asyncio.to_thread` Argon2id offloading, `SELECT ... FOR UPDATE` refresh locking, `INSERT ... ON CONFLICT DO UPDATE` upserts, `pg_trgm` `.ilike` search, `React.lazy()` route splitting across 7 views, and formula-safe CSV export.
  - **Verification:** `52/52` pytest, `44/44` Batch 7, `22/22` Batch 8 Security, `33/33` Batch 8 Pathways, `tsc --noEmit` (0 errors), `vite build` (1.89s).

### Phase 6 — Production Readiness (`6f7ca85`)
- **Objective:** Prepare Render Free + Neon Free PostgreSQL compatibility and production security controls.
- **Key Changes:**
  - Stripped `sslmode`/`channel_binding` from `async_database_uri` and mapped `ssl="require"` + `statement_cache_size=0` (`-pooler`) in `backend/app/core/config.py` and `alembic/env.py`.
  - Added 1 MiB `request_size_limit_middleware` (`413 PAYLOAD_TOO_LARGE`) and sanitized `/health/db` error output when `DEBUG=False`.
  - Created `render.yaml` (`alembic upgrade head && uvicorn app.main:create_application --factory --host 0.0.0.0 --port $PORT`).
- **Verification:** `53/53` pytest, `44/44` Batch 7, `22/22` Batch 8 Security, `33/33` Batch 8 Pathways, `0` lint/build errors, `0` npm audit vulnerabilities.

### Phase 6.5 & 6.5.1 — HttpOnly Cookies & Full Persistence Hardening
- **Migration `d4e5f6a7b8c9`:** Added `water_intake_records` table and `exercise_items.created_by_user_id` column.
- **Security Hardening:** Moved browser access tokens strictly to JS memory (`client.ts`), moved refresh tokens to `HttpOnly` cookies (`ascend_refresh_token`) with CSRF header enforcement (`X-Requested-With`), and added unknown-email Argon2id dummy-hash timing equalization.
- **Frontend Polish:** Gated dev-only QA buttons behind `import.meta.env.DEV`, added `vite.config.ts` `manualChunks` (`charts`, `icons`, `react`), and fixed `handleSignOut` cookie revocation.
- **Verification:** `56/56` pytest, `44/44` Batch 7, `22/22` Batch 8 Security, `33/33` Batch 8 Pathways.

### Phase 6.5.2 & 6.5.3 — Locked Vercel Same-Origin Proxy Architecture
- **Architectural Lock:** Finalized deployment stack on **Vercel (Frontend + Proxy) + Render Free (Backend) + Neon Free (PostgreSQL)** at ₹0/month (replacing earlier Cloudflare Pages cross-origin plans to avoid third-party refresh-cookie restrictions).
- **Implementation:** Created `vercel.json` and `api/proxy.ts` (server-side `RENDER_BACKEND_URL` validation, open-proxy/SSRF traversal guards, `x-vercel-forwarded-for` client IP handling, multi-`Set-Cookie` preservation via `getSetCookie()`, and `SameSite=Lax; Secure=True` production cookies).
- **Verification:** `16/16` Vercel proxy tests (`test_phase6_5_2_vercel_proxy.ts`), `57/57` pytest, `44/44` Batch 7, `22/22` Batch 8 Security, `33/33` Batch 8 Pathways.

### Phase 7 & Final Visual Polish
- **Visual Identity Redesign:** Migrated from green-heavy styling to Cool White (`#FFFFFF` / `#F8FAFC`), Deep Navy (`#0A1628`), Electric Cobalt (`#2563EB`), and isolated pathway accents (Green / Blue / Orange).
- **Interactive Enhancements:** Restored ~2.95s `StartupIntro` with measured logo-to-navbar flight transition, fixed sticky header (`overflow-x: clip`), added full-homepage `AscendCursorField` (`z-30` Canvas 2D), added homepage-only `HomeUserGuide`, eliminated Architecture Showcase remount lag, and upgraded `GoalsProfileView.tsx` (BMR/TDEE breakdown, pace projection, macro percentages, prominent hydration target, pathway strategy).
- **Verification:** `58/58` pytest, `44/44` Batch 7, `22/22` Batch 8 Security, `33/33` Batch 8 Pathways, `16/16` Vercel Proxy (**173/173 total**), plus headless Chromium CDP visual QA (`0` console errors, `0` horizontal overflow at `1440×900`, `768×1024`, `375×812`).

### Pre-Deployment Release Gate & Git Push (`22baa3e`)
- Audited food provenance, backend/API, PostgreSQL/Alembic (`d4e5f6a7b8c9 (head)`), Vercel/Render/Neon configs, and Git secret safety.
- Updated `.env.example` and `backend/.env.example` for Vercel + Render + Neon.
- Committed and pushed 76 files to `origin/main` as `22baa3ed91e89db1f565b828531fb16018fe37ff` (`feat: finalize vercel proxy, visual identity upgrade, and pre-deployment release gate`).
- **Status:** Pushed to `main`. Production deployment and post-deployment live browser verification are the subsequent milestone; Neon public food/workout catalog seeding is noted as a pre-launch condition.
