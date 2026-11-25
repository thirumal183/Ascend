# ASCEND — Database & API Reference

This document summarizes the **16-table PostgreSQL 16+ schema** (15 Phase 3 entities + `water_intake_records`), Alembic migration lineage, and **RESTful API v1** contracts.

For full DDL, Mermaid ER diagrams, JSON payloads, and security sequence diagrams, see the retained architecture specifications under [`docs/architecture/`](./architecture/):
- [ARCHITECTURE.md](./architecture/ARCHITECTURE.md)
- [DATABASE_DESIGN.md](./architecture/DATABASE_DESIGN.md)
- [ER_DIAGRAM.md](./architecture/ER_DIAGRAM.md)
- [API_SPECIFICATION.md](./architecture/API_SPECIFICATION.md)
- [SECURITY_DESIGN.md](./architecture/SECURITY_DESIGN.md)
- [FRONTEND_INTEGRATION.md](./architecture/FRONTEND_INTEGRATION.md)

---

## 1. Database Schema Overview (16 Tables + 1 View)

### Domain 1: Identity, Security & Profiles
- **`users`**: `id` (UUID PK), `email` (unique, regex check), `password_hash` (Argon2id), `full_name`, `is_active`, `is_demo_account`, `jwt_version` (global revocation epoch), timestamps.
- **`user_refresh_sessions`**: `id` (PK), `user_id` (FK `ON DELETE CASCADE`), `token_hash` (SHA-256 unique), `device_info`, `ip_address`, `expires_at`, `is_revoked`, `replaced_by_token_id` (self-FK lineage for replay detection).
- **`user_profiles`**: 1:1 with `users`; stores `pathway`, `archetype`, `goal_type`, `biological_sex`, `unit_system`, biometrics (`current_weight_kg`, `target_weight_kg`, `height_cm`, `age`), `activity_level`, `training_days_per_week`, and calculation parameters.
- **`nutrition_goals`**: 1:1 with `users`; separated from `user_profiles` to satisfy 3NF (`daily_calories`, `protein_g`, `carbs_g`, `fat_g`, `water_ml`, `daily_steps`, `weekly_workout_sessions`, `weekly_activity_minutes`).

### Domain 2: Nutrition, Food Catalog & Hydration (Pure 3NF)
- **`nutrients`**: Canonical INFOODS/USDA nutrient definitions (`ENERC_KCAL`, `PROCNT`, `CHOCDF`, `FAT`, `FIBTG`, `SUGAR`, `NA`, `K`, `CA`, `FE`).
- **`food_items`**: Metadata (`name`, `alternate_names` with `pg_trgm` GIN search support, `brand_or_source`, `category`, `preparation_state`, `reference_quantity`, `reference_unit`, `grams_per_serving`, `is_custom_user_food`, `created_by_user_id` FK). Contains **zero duplicated macro columns**.
- **`food_nutrients`**: Composite PK `(food_id, nutrient_id)` storing `amount_per_reference_qty`. Only measured nutrients have rows, preserving `null` for unmeasured micronutrients.
- **`v_food_items_with_nutrients`**: Read view joining `food_items` with core nutrients.
- **`intake_records`**: User meal logs (`user_id` FK, `food_id` FK `ON DELETE SET NULL`, `meal`, `date_logged`, `quantity`, `unit`) with **immutable frozen nutrient snapshots** (`computed_calories`, `computed_protein_g`, `computed_carbs_g`, `computed_fat_g`, `computed_fiber_g`, `computed_sodium_mg`).
- **`water_intake_records`** *(added in `d4e5f6a7b8c9`)*: `id` (PK), `user_id` (FK `ON DELETE CASCADE`), `amount_ml` (`CHECK > 0 AND <= 5000`), `date_logged`, `logged_at`, `notes`, indexed on `(user_id, date_logged)`.

### Domain 3: Workouts & Set Telemetry
- **`workout_plans`**: `id` (PK), `title`, `day_label`, `focus_area`, `estimated_minutes`, `intensity_label`, `target_calories_burned`, `is_system_template`, `created_by_user_id` *(added in `9c4f8a2b1d7e`)*.
- **`exercise_items`**: `id` (PK), `workout_plan_id` (FK), `name`, `target_sets`, `target_reps`, `rest_seconds`, `created_by_user_id` *(added in `d4e5f6a7b8c9` for user-scoped ad-hoc exercises; `NULL` = protected system template)*.
- **`workout_sessions`**: User workout executions (`user_id` FK, `workout_plan_id` FK, `date_logged`, `duration_minutes`, `calories_burned`, `completed`).
- **`exercise_set_logs`**: Per-set telemetry (`workout_session_id` FK, `exercise_item_id` FK, `set_number`, `actual_reps`, `actual_load_kg`, `completed`, `rpe`) updated via atomic `INSERT ... ON CONFLICT DO UPDATE`.

### Domain 4: Biometrics & Progress
- **`progress_records`**: Time-series body measurements (`user_id` FK, `date_logged`, `weight_kg`, `body_fat_pct`, `waist_cm`, `chest_cm`, `arm_cm`, `thigh_cm`, `steps_count`, `calories_consumed`, `notes`) with unique `(user_id, date_logged)` upsert support.

### Domain 5: Conversational AI Coach
- **`chat_conversations`**: User conversation containers (`user_id` FK, `title`, timestamps).
- **`chat_messages`**: Individual turns (`conversation_id` FK, `user_id` FK, `role`, `content`, `structured_insight` JSONB, `is_mock_response`, `created_at`).

---

## 2. Alembic Migration History

| Revision ID | Description |
| :--- | :--- |
| `254b250445d3` | Initial schema: 15 core entities + `v_food_items_with_nutrients` + `pg_trgm` extension |
| `9c4f8a2b1d7e` | Added `workout_plans.created_by_user_id` FK (`ON DELETE CASCADE`) for custom plan ownership |
| `d4e5f6a7b8c9` *(head)* | Added `water_intake_records` table and `exercise_items.created_by_user_id` FK (`ON DELETE CASCADE`) |

---

## 3. RESTful API v1 Endpoint Groups (`/api/v1`)

All endpoints enforce Pydantic v2 validation, RFC-style `{"error": {"code", "message", "details"}}` error responses, and strict row-level ownership (`current_user.id`) on user-scoped resources.

| Prefix | Endpoints | Purpose |
| :--- | :--- | :--- |
| `/health` | `GET /health`, `GET /health/db` | Liveness and Neon PostgreSQL `SELECT 1` readiness probes |
| `/auth` | `POST /register`, `POST /token`, `POST /login`, `POST /refresh`, `POST /logout`, `POST /verify-password`, `GET /me`, `GET /sessions`, `DELETE /sessions/{id}` | Argon2id auth, JWT issuance, rotating `HttpOnly` refresh cookies, session management |
| `/users` | `PUT /me/profile`, `POST /me/pathway`, `PUT /me/goals` | Profile updates, password-verified pathway switching, custom nutrition targets |
| `/foods` | `GET /search`, `GET /{food_id}`, `POST /custom`, `DELETE /custom/{food_id}` | Trigram food search, full nutrient details, user-private custom foods |
| `/intake` | `POST /records`, `GET /daily`, `PUT /records/{id}`, `DELETE /records/{id}`, `GET /reports`, `GET /water`, `POST /water`, `PUT /water/{id}`, `DELETE /water/{id}` | Meal logging with frozen snapshots, 30-day adherence reports, water intake CRUD |
| `/workouts` | `GET /plans`, `GET /plans/{id}`, `POST /plans`, `DELETE /plans/{id}`, `GET /exercises`, `GET /exercises/{id}`, `POST /plans/{id}/exercises`, `PUT /exercises/{id}`, `DELETE /exercises/{id}`, `POST /sessions`, `GET /sessions`, `GET /sessions/{id}`, `PUT /sessions/{id}`, `DELETE /sessions/{id}`, `PUT /sessions/{id}/sets` | System & user workout plans, ad-hoc exercises, session & set telemetry |
| `/progress` | `GET /records`, `POST /records`, `GET /records/{id}`, `PUT /records/{id}`, `DELETE /records/{id}`, `GET /summary` | Biometric check-ins (partial same-date upsert), record CRUD & trend summaries |
| `/ai` | `POST /chat`, `GET /conversations`, `GET /conversations/{id}`, `DELETE /conversations/{id}` | Multi-turn Gemini 2.5 Flash coaching with deterministic local fallback |
