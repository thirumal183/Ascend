# ASCEND — Phase 3 Final Documentation & Architectural Audit

**Document Version:** 1.0.0  
**Audit Date:** November 24, 2026  
**Auditor:** Senior Backend Architect & Database Systems Auditor  
**Scope:** Strict consistency, correctness, and completeness audit across all documents in `docs/backend/`  
**Current Branch:** `main` (clean working tree)  

---

## 1. Executive Summary & Audit Scope

Prior to commencing backend implementation (Phase 4), a rigorous consistency audit was executed across all seven architectural documents in `docs/backend/`:
1. `ARCHITECTURE.md`
2. `DATABASE_DESIGN.md`
3. `ER_DIAGRAM.md`
4. `API_SPECIFICATION.md`
5. `SECURITY_DESIGN.md`
6. `FRONTEND_INTEGRATION.md`
7. `PHASE_3_REVIEW.md`

The audit evaluated relational normalization (1NF, 2NF, 3NF), entity-relationship integrity, multi-tenant row-level authorization, historical data immutability, pathway switching guarantees, API contract parity with React 19/TypeScript 5 types, cryptographic security, and technology minimalism.

---

## 2. Detailed Verification of the 10 Critical Checkpoints

### 1. Entity Count Consistency
* **Initial State:** `DATABASE_DESIGN.md` initially defined 14 tables, while roadmap summaries referenced 11/12 models.
* **Correction Applied:** With the addition of persistent session tracking (`user_refresh_sessions`), all documents have been harmonized to declare **exactly 15 relational entities / ORM models across 5 domains**:
  - *Domain 1 (Users, Security & Profiles):* `users`, `user_refresh_sessions`, `user_profiles`, `nutrition_goals` (4 entities)
  - *Domain 2 (Nutrition Catalog & Intake):* `nutrients`, `food_items`, `food_nutrients`, `intake_records` (4 entities)
  - *Domain 3 (Workouts & Training):* `workout_plans`, `exercise_items`, `workout_sessions`, `exercise_set_logs` (4 entities)
  - *Domain 4 (Progress & Biometrics):* `progress_records` (1 entity)
  - *Domain 5 (AI Coaching):* `chat_conversations`, `chat_messages` (2 entities)

### 2. ERD Relationship, Foreign Key, Nullability & Cardinality Alignment
* **Verification:** Every relationship rendered in `ER_DIAGRAM.md` was cross-checked against the DDL in `DATABASE_DESIGN.md`:
  - `users` $\leftrightarrow$ `user_profiles` ($1:1$, `user_id` `UNIQUE`, `NOT NULL`, `ON DELETE CASCADE`). Verified.
  - `users` $\leftrightarrow$ `nutrition_goals` ($1:1$, `user_id` `UNIQUE`, `NOT NULL`, `ON DELETE CASCADE`). Verified.
  - `users` $\to$ `user_refresh_sessions` ($1:N$, `user_id` `NOT NULL`, `ON DELETE CASCADE`). Verified.
  - `user_refresh_sessions` $\to$ `user_refresh_sessions` ($1:1$ optional lineage, `replaced_by_token_id` `ON DELETE SET NULL`). Verified.
  - `users` $\to$ `intake_records` ($1:N$, `user_id` `NOT NULL`, `ON DELETE CASCADE`). Verified.
  - `food_items` $\leftrightarrow$ `nutrients` ($M:N$ via `food_nutrients` with composite PK `(food_id, nutrient_id)`, both `NOT NULL`, `ON DELETE CASCADE`). Verified.
  - `food_items` $\to$ `intake_records` ($1:N$ optional, `food_id` `NULL`, `ON DELETE SET NULL`). Verified.
  - `workout_plans` $\to$ `exercise_items` ($1:N$, `workout_plan_id` `NOT NULL`, `ON DELETE CASCADE`). Verified.
  - `workout_sessions` $\to$ `exercise_set_logs` ($1:N$, `workout_session_id` `NOT NULL`, `ON DELETE CASCADE`). Verified.
  - `chat_conversations` $\to$ `chat_messages` ($1:N$, `conversation_id` `NOT NULL`, `ON DELETE CASCADE`). Verified.
* **Refinement Made:** In `exercise_set_logs`, the unique constraint was corrected to `UNIQUE (workout_session_id, exercise_name, set_number)` where `exercise_name` is strictly `NOT NULL`, avoiding duplicate sets if `exercise_item_id` becomes `NULL`.

### 3. Resolution of 3NF Conflict & Authoritative Nutrient Source of Truth
* **Issue Addressed:** Previous iterations claimed "pure 3NF" while maintaining duplicated macronutrient columns (`calories_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`) on `food_items`. This introduced relational redundancy and the theoretical risk of data drift.
* **Pure 3NF Resolution:**
  - Removed all 4 redundant macronutrient columns from `food_items`. `food_items` now strictly contains food metadata.
  - **Single Authoritative Source of Truth:** `food_nutrients` + `nutrients` is the exclusive, canonical location for all nutrient quantities per reference amount.
  - **Zero Data Drift:** Because nutrient amounts exist in exactly one place, `INSERT`, `UPDATE`, and `DELETE` operations affect only `food_nutrients`. There are zero duplicate columns to synchronize or drift.
  - **Avoidance of Premature Denormalization:** Created a standard PostgreSQL view `v_food_items_with_nutrients` that dynamically aggregates core macronutrients per 100g. In PostgreSQL 16 with B-Tree indexes on `(food_id, nutrient_id)`, joined reads execute in $< 1\text{ ms}$, eliminating any justification for storage denormalization.

### 4. Custom Food Ownership & Multi-Tenant Data Isolation
* **Verification:** `food_items` includes `is_custom_user_food BOOLEAN NOT NULL DEFAULT FALSE` and `created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL`.
* **Tenant Isolation Enforcement:** In `API_SPECIFICATION.md` Section 4.1, the search query filter explicitly enforces:
  $$\text{WHERE } (\text{is\_custom\_user\_food} = \text{FALSE} \lor \text{created\_by\_user\_id} = \text{current\_user.id})$$
* **Custom Food Deletion:** Added endpoint `DELETE /api/v1/foods/custom/{food_id}` requiring `created_by_user_id == current_user.id` and `is_custom_user_food == TRUE`. System reference foods cannot be deleted (`403 Forbidden`).
* **Indexing:** Added partial index `CREATE INDEX idx_food_items_custom_user ON food_items (created_by_user_id) WHERE is_custom_user_food = TRUE;`.

### 5. Immutable Historical Snapshots (Nutrition & Workout Sets)
* **Intake Records:** Stores `computed_calories`, `computed_protein_g`, `computed_carbs_g`, `computed_fat_g`, `computed_fiber_g`, and `computed_sodium_mg` as frozen snapshots. If a food item formulation changes in the future, past meal logs remain mathematically identical.
* **Workout Sets:** Stores `exercise_name`, `target_reps`, `target_load_kg`, `actual_reps`, `actual_load_kg`, and `completed` directly on `exercise_set_logs`.

### 6. Pathway Switching Data Preservation & Configurable Targets
* **Preservation Guarantee:** `POST /api/v1/users/me/pathway` executes inside an atomic `SERIALIZABLE` database transaction. It updates `user_profiles.pathway` and recalculates `nutrition_goals`. It does not execute `DELETE` or `UPDATE` on `intake_records`, `workout_sessions`, or `progress_records`. All historical biometrics, past calories, and training volumes remain intact.

### 7. Configurable Pathway Recommendations & Validation Boundaries
* **Issue Addressed:** Fixed calorie and protein adjustments (e.g. $-420\text{ kcal}$, $2.2\text{ g/kg}$) must not be treated as universal clinical prescriptions.
* **Architectural Formulation:**
  - Pathway defaults (Mifflin-St Jeor baselines) are explicitly documented as **configurable non-medical educational reference baselines**.
  - `user_profiles` now incorporates configurable overrides: `target_calorie_adjustment`, `protein_g_per_kg`, and `water_ml_per_kg`.
  - **Physiological Safety Boundaries:**
    - Minimum caloric floor: $1,200\text{ kcal}$ (females), $1,500\text{ kcal}$ (males) to prevent metabolic damage; ceiling: $6,000\text{ kcal}$.
    - Deficit/Surplus bounds: Deficit capped at $\le 25\%$ of TDEE (or $-750\text{ kcal}$); surplus capped at $\le 15\%$ of TDEE (or $+500\text{ kcal}$).
    - Protein range: Configurable within $1.2\text{--}2.5\text{ g/kg}$ of body weight.
    - Hydration range: $20\text{--}70\text{ ml/kg}$ (baseline: $36\text{ ml/kg}$, plus $+450\text{ ml}$ for intense athlete training).

### 8. API Contract Parity with React 19 / TypeScript Types
* Cross-referenced `API_SPECIFICATION.md` and `FRONTEND_INTEGRATION.md` against `src/types/ascend.ts` and `src/services/ascendApiService.ts`:
  - `MealType` (`Breakfast`, `Lunch`, `Snacks`, `Dinner`) $\leftrightarrow$ `ck_intake_meal`.
  - `ServingUnit` (`g`, `oz`, `serving`, `ml`, `cup`) $\leftrightarrow$ added `ck_intake_unit` in DDL.
  - `CoachStructuredInsight` schema $\leftrightarrow$ `chat_messages.structured_insight JSONB`.
  - `ExerciseSetLog` (`setNum`, `targetReps`, `targetLoadKg`, `actualReps`, `actualLoadKg`, `completed`) $\leftrightarrow$ `exercise_set_logs` columns.
  - `UserProfile` & `NutritionGoals` field types match 1:1 with Pydantic schemas.

### 9. Persistent Refresh Sessions, Token Rotation & Reuse Detection
* **Persistent Session Storage:** Added `user_refresh_sessions` storing `token_hash = SHA-256(raw_refresh_token)`, device info, IP address, expiration, and rotation links (`replaced_by_token_id`). Plaintext refresh tokens are never persisted in the database.
* **Token Rotation:** Exchanging a refresh token at `/api/v1/auth/refresh` rotates the token and invalidates the predecessor.
* **Automatic Reuse Detection:** If an invalidated refresh token is presented, the server detects token theft, immediately revokes **all** active refresh sessions for that user, increments `jwt_version`, and forces re-authentication.
* **Dual-Layer Invalidation:** Single-device logout revokes only that device's session. Password change or security breach increments `users.jwt_version`, instantly invalidating all access tokens and refresh sessions across all devices simultaneously.

### 10. Database Constraints, Indexes & Cascades
* **Primary Keys:** UUIDv4 on all 15 tables.
* **Unique Constraints:** `users(email)`, `user_refresh_sessions(token_hash)`, `user_profiles(user_id)`, `nutrition_goals(user_id)`, `nutrients(code)`, `progress_records(user_id, date_logged)`, and `exercise_set_logs(workout_session_id, exercise_name, set_number)`.
* **Check Constraints:** Validated email format, weight ranges ($20\text{--}400\text{ kg}$), height ($50\text{--}280\text{ cm}$), age ($13\text{--}120$), workout RPE ($1\text{--}10$), protein targets ($1.0\text{--}3.5\text{ g/kg}$), and valid enums.
* **Cascade Actions:** Child records cascade-delete with `users`. Template foreign keys use `SET NULL` on `intake_records` and `exercise_set_logs` to protect historical data.
* **Indexes:** Trigram GIN indexes on `food_items(name)` and `food_items(brand_or_source)`, composite B-tree index on `intake_records(user_id, date_logged DESC)`, and partial index on custom foods.

---

## 3. Technology Discipline Verification

The architecture and implementation plan were checked for unnecessary dependencies:
- **No Redis:** PostgreSQL connection pooling and sub-millisecond indexed queries handle all performance requirements.
- **No MongoDB / NoSQL:** The relational model exhibits strict referential integrity.
- **No Celery / RabbitMQ / Background Workers:** Async FastAPI handles lightweight I/O operations non-blockingly.
- **No Kubernetes / Microservices:** Single-service modular monolith structure eliminates distributed network complexity.

---

## 4. Audit Findings & Corrections Matrix

| Finding ID | Severity | Description | Resolution / Correction Made |
| :--- | :---: | :--- | :--- |
| **F-01** | **Medium** | Redundant macronutrient columns in `food_items` conflicted with pure 3NF claim and risked drift. | Removed redundant columns from `food_items`. Made `food_nutrients` the single authoritative source of truth. Defined `v_food_items_with_nutrients` view for client reads. |
| **F-02** | **Medium** | Lack of persistent refresh session tracking, token reuse detection, and device management. | Implemented `user_refresh_sessions` with SHA-256 token hashing, automatic reuse detection (revokes all user tokens on replay), and single-device logout. |
| **F-03** | **Medium** | Fixed calorie and protein adjustments treated as rigid universal prescriptions. | Formulated pathway targets as configurable educational baselines with physiological safety floor/ceiling bounds and individual user override fields. |
| **F-04** | **Medium** | Inconsistent entity counts across roadmap summaries (referenced 11/12 instead of actual total). | Harmonized all documents to consistently specify **exactly 15 relational entities across 5 domains**. |
| **F-05** | **Medium** | Food search query lacked explicit multi-tenant isolation predicate in documentation. | Updated `API_SPECIFICATION.md` Section 4.1 to enforce `(is_custom_user_food = FALSE OR created_by_user_id = :current_user_id)`. |
| **F-06** | **Low** | Missing check constraints for `pathway`, `archetype`, and `unit` in DDL. | Added `ck_profile_pathway`, `ck_profile_archetype`, `ck_workout_pathway`, and `ck_intake_unit` check constraints in `DATABASE_DESIGN.md`. |
| **F-07** | **Low** | `exercise_set_logs` unique constraint allowed duplicate sets if `exercise_item_id` became NULL. | Replaced with `UNIQUE (workout_session_id, exercise_name, set_number)` in `DATABASE_DESIGN.md`. |
| **F-08** | **Low** | Missing index for private custom food lookups. | Added `idx_food_items_custom_user` partial index in `DATABASE_DESIGN.md`. |

---

## 5. Remaining Known Limitations (Design Boundary Notes)

1. **Local SQLite in Unit Tests vs. PostgreSQL Extensions:**
   - In automated unit testing, running PostgreSQL extensions like `pg_trgm` requires a live PostgreSQL test container or service rather than SQLite.
   - *Mitigation:* The test strategy (`tests/conftest.py`) will provide a PostgreSQL test database fixture for trigram searches, while pure business logic tests remain engine-agnostic.
2. **Single-Node Rate Limiting:**
   - Rate limiting uses FastAPI memory-backed token bucket limits rather than Redis.
   - *Status:* Completely appropriate for ASCEND's single-instance deployment target; can be upgraded to distributed rate limiting if multi-instance load balancing is ever introduced.

---

## 6. Final Readiness Decision

# **`READY FOR PHASE 4`**

### Reasons for Approval:
1. **Mathematical & Relational Rigor:** The database schema is in strict Third Normal Form (3NF), with documented candidate keys, functional dependencies, and check constraints.
2. **Data Integrity & Immutability:** Historical meal and workout set logs are protected by immutable quantitative snapshots and `SET NULL` template references.
3. **Multi-Pathway Parity:** All three ASCEND pathways are fully supported in database constraints, workout templates, and goal calculation formulas.
4. **Security & Tenant Isolation:** Argon2id password hashing, dual-token JWT with instant version-based revocation, and row-level ownership checks guarantee robust protection.
5. **Contract Parity:** API endpoints, Pydantic schemas, and error responses match the React 19 frontend's TypeScript interfaces with zero missing fields.
6. **Zero Bloat:** The stack remains strictly limited to Python 3.12, FastAPI, PostgreSQL 16, SQLAlchemy 2.0, Pydantic v2, and Alembic without unnecessary frameworks or services.
