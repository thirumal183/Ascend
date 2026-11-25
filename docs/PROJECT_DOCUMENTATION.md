# ASCEND — Comprehensive Project Documentation

**Version:** 1.0.0
**Repository:** `https://github.com/thirumal183/Ascend`
**Primary Branch:** `main` (`22baa3e`)
**Tagline:** *"Getting Better Every Day."*

---

## 1. Introduction

**ASCEND** is an AI-powered nutrition, workout, and biometric tracking platform built to deliver structured, science-grounded daily guidance across distinct fitness goals. Rather than treating every user with a single generic calorie counter, ASCEND adapts its dashboard, macronutrient ratios, hydration targets, workout templates, and AI Coach context to the user's selected pathway.

---

## 2. Problem Statement & Objectives

### Problem Statement
Most student or entry-level fitness trackers suffer from three common shortcomings:
1. **One-size-fits-all targets** that ignore differences between everyday health maintenance, high-output athletic training, and lean muscle gain.
2. **Inaccurate food scaling & mutable logs**, where raw vs. cooked states are conflated, unmeasured micronutrients are displayed as `0`, or updating a food item retroactively alters historical meal logs.
3. **Weak security & brittle persistence**, such as storing JWT refresh tokens in `localStorage` or relying on hardcoded client-side mock data.

### Project Objectives
- Provide **three goal-tailored user pathways** backed by a single Mifflin-St Jeor calculation engine.
- Maintain **strict 3NF relational food and nutrient modeling** with immutable historical intake snapshots and `null` preservation for unmeasured micronutrients.
- Implement **production-grade authentication** (Argon2id hashing, memory-only JWT access tokens, `HttpOnly` rotating refresh cookies with reuse detection, and CSRF protection).
- Deliver **context-aware AI coaching** using Google Gemini 2.5 Flash with a deterministic local heuristic fallback and explicit non-medical boundaries.
- Target a **₹0/month deployment architecture** on Vercel, Render Free, and Neon Free PostgreSQL.

---

## 3. Three User Pathways

| Pathway | Target Archetype | Default Energy Strategy | Macro & Hydration Focus |
| :--- | :--- | :--- | :--- |
| **1. General Nutrition & Diet** | Everyday health & sustainable fat loss/maintenance | `-420 kcal/day` deficit (Weight Loss) or `0` (Maintenance) | Balanced `1.8–2.0 g/kg` protein, `36 ml/kg` hydration, consistency-first habits |
| **2. Athlete Performance** | High-output training & endurance/conditioning | `+200 kcal/day` fueling buffer | `2.2 g/kg` protein, higher carbohydrate allocation, `+450 ml` sweat-loss hydration buffer |
| **3. Weight Gain & Muscle Gain** | Hypertrophy & controlled lean mass gain | `+350 kcal/day` lean surplus | `2.1 g/kg` protein across 4 feeding windows, progressive overload set tracking |

---

## 4. Major Implemented Features

- **Editorial Landing Page & Startup Intro:** ~2.95s staged startup intro (`StartupIntro.tsx`) with logo-to-navbar transition, `[ESC]`/click skip, `prefers-reduced-motion` support, interactive 5-tab product preview, sticky scroll-spy navigation, Canvas 2D cursor field (`AscendCursorField.tsx`), and homepage-only floating user guide (`HomeUserGuide.tsx`).
- **Pathway-Specific Dashboards:** Distinct layouts for General Nutrition (calorie balance ring, meal timeline), Athlete Performance (priority training spotlight, nutrient timing windows), and Muscle Gain (caloric surplus gauge, 4 anabolic protein feeding windows), plus shared biometric trend charts.
- **Diet & Meal Logging:** Searchable food catalog (`pg_trgm` trigram search), raw/cooked preparation tags, unit-aware portion scaling (`g`, `ml`, `oz`, `cup`, `serving`), side-by-side food comparison, custom user-private food creation, and immutable meal snapshots.
- **Hydration Tracking:** Quick `+250ml` / `+500ml` / `+750ml` / `-250ml` controls persisted in PostgreSQL (`water_intake_records`).
- **Workout Planning & Set Telemetry:** Pathway workout templates, custom workout plans, user-scoped ad-hoc exercise creation, live inter-set rest countdown timer, and per-set reps/load (`kg`)/RPE logging (`exercise_set_logs`).
- **Progress Analytics:** Weight, body fat %, and circumference (waist, chest, arm, thigh) check-ins with 28-day filtering and Recharts trend curves.
- **Goals & Personal Profile:** Live Mifflin-St Jeor BMR/TDEE breakdown, pace projection, macro percentage shares, hydration target display, weekly activity targets, and customizable overrides.
- **AI Nutrition & Performance Coach:** Multi-turn conversational coaching backed by Gemini 2.5 Flash or deterministic local heuristics, structured insight cards, privacy disclosure banner, and explicit non-medical disclaimer.
- **Calendar & Reports:** Monthly adherence calendar (`CalendarView.tsx`), 7-day rolling adherence matrix, and formula-injection-safe CSV export (`ReportsView.tsx`).
- **Settings & Security Controls:** Password-confirmed pathway switching (preserving full historical data), metric/imperial unit switching, and explicit Demo Mode isolation.

---

## 5. Frontend & Backend Architecture

### Frontend (`src/`)
- **Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, Lucide icons, Recharts.
- **Code Splitting:** `React.lazy()` across 7 secondary views plus Vite `manualChunks` separating `react`, `charts`, and `icons`.
- **API Boundary (`src/services/api/`):** Centralized `client.ts` with `resolveApiBaseUrl()` (`/api/v1` in production browser, `http://localhost:8000/api/v1` in local dev/CLI), concurrent 401 refresh queueing, and typed domain clients (`authApi`, `usersApi`, `nutritionApi`, `workoutApi`, `progressApi`, `aiCoachApi`).

### Backend (`backend/app/`)
- **Stack:** Python 3.13, FastAPI, SQLAlchemy 2.0 Async, `asyncpg`, Pydantic v2, Alembic.
- **Layered Design:**
  - `api/v1/endpoints/`: Thin HTTP routers (`auth`, `users`, `foods`, `intake`, `workouts`, `progress`, `ai`, `health`).
  - `services/`: Encapsulated business logic (`auth_service`, `nutrition_calculator`, `nutrition_service`, `workout_service`, `progress_service`, `ai_coach_service`).
  - `models/` & `schemas/`: 16 SQLAlchemy ORM tables + strict Pydantic v2 DTOs.
  - `core/`: Settings (`config.py`), Argon2id/JWT (`security.py`), async pool (`database.py`), sliding-window rate limiter (`rate_limit.py`), and RFC-style error handlers (`exceptions.py`).

### Request Flow (Production)
```text
Browser (React 19 SPA)
  ──(Same-Origin HTTPS + HttpOnly Cookie + Bearer JWT)──▶ Vercel Serverless Proxy (/api/proxy.ts)
  ──(Server-to-Server HTTPS + X-Forwarded-For)──────────▶ Render FastAPI (/api/v1/*)
  ──(TLS + PgBouncer asyncpg)───────────────────────────▶ Neon PostgreSQL 16+
```

---

## 6. Authentication, AI Coach & Nutrition Calculations

- **Authentication:** Passwords hashed with Argon2id via `asyncio.to_thread` (with dummy-hash verification on unknown emails for timing equalization). Access tokens (30-min HS256 JWT) live strictly in JS memory; refresh tokens (7-day opaque secrets) are stored as `SHA-256` hashes in `user_refresh_sessions` and delivered to browsers via `HttpOnly; Secure; SameSite=Lax` cookies scoped to `/api/v1/auth` with `X-Requested-With` CSRF validation.
- **AI Coach:** `AICoachService` commits the user turn before calling Gemini (`x-goog-api-key` header, isolated `systemInstruction` containing only telemetry—never email/password/name). When `GEMINI_API_KEY` is unset or times out, deterministic pathway heuristics respond and flag `isMockResponse=true`.
- **Nutrition Calculations:** Mifflin-St Jeor BMR + activity multipliers (`1.2`–`1.9`), safety caps (`min(25%, 750)` deficit, `min(15%, 500)` surplus), caloric floors (`1200` female / `1500` male), and `36 ml/kg` hydration (`+450 ml` Athlete). *Note:* Frontend preview `computeRecommendedTargets` uses `28%` fat for General/Muscle Gain (`25%` Athlete) and a `1400 kcal` floor, whereas backend `nutrition_calculator.py` uses `25%` fat across all pathways with `1200`/`1500 kcal` floors and safety caps. All targets are educational reference estimates, not medical prescriptions.

---

## 7. Implemented vs. Demo / Future Scope

- **Implemented Production Features:** Full PostgreSQL persistence for auth, profiles, goals, custom foods, meal intake snapshots, water intake, workout plans/exercises/sessions/set logs, progress records, and AI conversations, plus an idempotent food-data ingestion pipeline (`backend/app/db/ingest/`) supporting USDA FoodData Central, Open Food Facts, documented Indian culinary recipe estimates, and 3-pathway system workout template seeding.
- **Demo / Prototype Mode:** Unauthenticated visitors can click **Explore Live Demo** to test preloaded sample meals, workouts, and progress charts locally (`prototypeSessionStorage`) without touching the backend database. Demo foods are explicitly labeled `Demo Baseline` (`legacy_demo` / `demonstration`) and strictly cleared upon live sign-in.
- **Pre-Launch Seeding Step:** Local PostgreSQL verification has imported 8,157 USDA FoodData Central items, 15 Indian recipe estimates, and 3 system workout templates; production Neon seeding must be executed explicitly via `backend/app/db/ingest/cli.py` during deployment (see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) and [FOOD_DATA_PROVENANCE_AND_INGESTION.md](./FOOD_DATA_PROVENANCE_AND_INGESTION.md)).
- **Future Scope:** Live deployed browser E2E verification, bulk Open Food Facts regional catalog import once upstream exports are fetched, wearable step/HR sync, and offline PWA caching.

---

## 8. Project Structure & Local Development

See [README.md](../README.md) for the repository tree and Windows-friendly local setup instructions, [DATABASE_AND_API.md](./DATABASE_AND_API.md) for schema/API contracts, [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for Vercel + Render + Neon setup, and [ENGINEERING_AND_RELEASE_HISTORY.md](./ENGINEERING_AND_RELEASE_HISTORY.md) for the full chronological engineering log.
