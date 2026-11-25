# ASCEND — RESTful API Specification (v1)

**Document Version:** 1.0.0  
**Base URL:** `http://localhost:8000/api/v1`  
**Protocol:** HTTPS / HTTP (Development)  
**Authentication:** HTTP Bearer JSON Web Token (JWT)  
**Status:** Approved Architectural Design (Phase 3)  
**Author:** Senior Backend Architect & API Designer  

---

## 1. Global API Conventions

### 1.1 Standard Response Envelope

All single-resource responses return the resource schema directly. Collections return an envelope with total counts:

```json
{
  "items": [ ... ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

### 1.2 Standard Error Response Schema

All errors follow the RFC 7807 problem details specification:

```json
{
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Resource not found.",
    "details": null
  }
}
```

Standard Error Codes:
- `UNAUTHORIZED` (401): Missing, expired, or invalid JWT token.
- `FORBIDDEN` (403): User lacks permission to access or modify resource.
- `ENTITY_NOT_FOUND` (404): Requested entity does not exist.
- `VALIDATION_ERROR` (422): Request payload violates Pydantic schema constraints.
- `CONFLICT` (409): Unique constraint collision (e.g., email already registered).
- `INTERNAL_ERROR` (500): Unhandled exception in database or service layer.

---

## 2. Authentication Domain (`/api/v1/auth`)

### 2.1 User Registration
* **Endpoint:** `POST /api/v1/auth/register`
* **Auth Required:** No (Public)
* **Request Body:**
```json
{
  "email": "user@ascend.io",
  "password": "StrongPassword123!",
  "fullName": "Alex Mercer",
  "pathway": "General Nutrition & Diet",
  "archetype": "General Fitness & Lifestyle",
  "goalType": "Weight Loss",
  "biologicalSex": "female",
  "currentWeightKg": 68.5,
  "targetWeightKg": 64.0,
  "heightCm": 168.0,
  "age": 27,
  "activityLevel": "Moderately Active",
  "unitSystem": "Metric (kg, cm, ml)",
  "trainingDaysPerWeek": 4
}
```
* **Validation Rules:** Valid email format; password minimum 8 chars with 1 number and 1 special char; valid pathway enum; positive biometric values.
* **Response (201 Created):**
```json
{
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "user@ascend.io",
    "fullName": "Alex Mercer",
    "isActive": true
  },
  "tokens": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "tokenType": "Bearer",
    "expiresIn": 1800
  }
}
```

### 2.2 User Login (Token Generation)
* **Endpoint:** `POST /api/v1/auth/token`
* **Auth Required:** No (OAuth2 standard form-urlencoded or JSON)
* **Request Body (`application/json`):**
```json
{
  "username": "user@ascend.io",
  "password": "StrongPassword123!"
}
```
* **Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresIn": 1800
}
```
* **Errors:** `401 Unauthorized` for invalid credentials.

### 2.3 Token Refresh & Rotation
* **Endpoint:** `POST /api/v1/auth/refresh`
* **Auth Required:** No (Opaque Refresh Token provided in body or secure HTTP-only cookie)
* **Request Body:**
```json
{
  "refreshToken": "ascend_rt_9f8b7a6c5d4e3f2a1b0c..."
}
```
* **Security & Rotation Flow:**
  1. Hashes token: `token_hash = SHA-256(refreshToken)`.
  2. Queries `user_refresh_sessions`.
  3. If session is already marked `is_revoked == TRUE`: **Reuse detected!** Server immediately revokes all active sessions for the user and returns `401 Unauthorized (REUSE_DETECTED)`.
  4. If session is active and not expired: Marks current session `is_revoked = TRUE`, generates new refresh token, saves new session record with `replaced_by_token_id`, and issues new access token.
* **Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "ascend_rt_new_token_string...",
  "tokenType": "Bearer",
  "expiresIn": 1800
}
```

### 2.4 User Logout
* **Endpoint:** `POST /api/v1/auth/logout`
* **Auth Required:** Yes (Bearer JWT)
* **Request Body (Optional):**
```json
{
  "refreshToken": "ascend_rt_9f8b7a6c5d4e3f2a1b0c..."
}
```
* **Behavior:** Marks the specific device's refresh token session as revoked (`is_revoked = TRUE`). If no refresh token is provided, increments `user.jwt_version` to invalidate all active tokens globally.
* **Response (200 OK):** `{"message": "Successfully logged out."}`

### 2.5 List & Manage Active Device Sessions
* **Endpoint:** `GET /api/v1/auth/sessions`
* **Auth Required:** Yes
* **Response (200 OK):**
```json
{
  "sessions": [
    {
      "id": "sess-uuid-1",
      "deviceInfo": "Chrome 131 on Windows 11",
      "ipAddress": "192.168.1.105",
      "createdAt": "2026-11-24T10:00:00Z",
      "expiresAt": "2026-12-01T10:00:00Z",
      "isCurrent": true
    }
  ]
}
```

* **Endpoint:** `DELETE /api/v1/auth/sessions/{session_id}`
* **Auth Required:** Yes
* **Behavior:** Revokes the specific remote device session (`is_revoked = TRUE`).
* **Response (204 No Content).**

### 2.6 Get Current User Profile & State
* **Endpoint:** `GET /api/v1/auth/me`
* **Auth Required:** Yes (Bearer JWT)
* **Response (200 OK):** Returns composite object containing `account`, `userProfile`, and active `nutritionGoals`.

---

## 3. User & Pathway Management (`/api/v1/users`)

### 3.1 Update User Biometric Profile
* **Endpoint:** `PUT /api/v1/users/me/profile`
* **Auth Required:** Yes
* **Request Body:** Partial or complete `UserProfile` fields.
* **Behavior:** Updates `user_profiles` and automatically recalculates recommended targets if weight, height, age, or sex changed, while respecting any user-configured adjustment overrides.
* **Response (200 OK):** Updated `UserProfile` and recomputed `NutritionGoals`.

### 3.2 Switch Active Pathway & Configure Targets
* **Endpoint:** `POST /api/v1/users/me/pathway`
* **Auth Required:** Yes
* **Request Body:**
```json
{
  "pathway": "Athlete Performance",
  "recalculateGoals": true,
  "customCalorieAdjustment": null,
  "customProteinPerKg": null
}
```
* **Pathway Baseline Assumptions & Safety Boundaries:**
  - *Non-Medical Nature:* Target recommendations are non-medical educational estimates derived from the scientific Mifflin-St Jeor equation with biological sex constant offsets ($s = +5$ for male, $s = -161$ for female). They are starting baselines, **not universal clinical prescriptions**.
  - *Pathway Baselines:*
    - **General Nutrition & Diet:** Baseline protein $1.8\text{ g/kg}$; standard weight-loss deficit baseline $-420\text{ kcal}$; hydration $36\text{ ml/kg}$.
    - **Athlete Performance:** Baseline protein $2.2\text{ g/kg}$; performance energy offset $+200\text{ kcal}$; hydration $36\text{ ml/kg} + 450\text{ ml}$ for training replenishment.
    - **Weight Gain & Muscle Gain:** Baseline protein $2.1\text{ g/kg}$; caloric surplus baseline $+350\text{ kcal}$; hydration $36\text{ ml/kg}$.
  - *Validation Boundaries:*
    - **Caloric Floor:** Minimum safe floor enforced at $1,200\text{ kcal}$ (females) and $1,500\text{ kcal}$ (males) to prevent metabolic distress; maximum ceiling $6,000\text{ kcal}$.
    - **Deficit/Surplus Limits:** Deficits capped at maximum $25\%$ of TDEE (or $-750\text{ kcal}$); surpluses capped at maximum $15\%$ of TDEE (or $+500\text{ kcal}$).
    - **Protein Range:** User-configurable within the physiological safe boundary of $1.2\text{--}2.5\text{ g/kg}$ of body weight.
* **Behavior:** Atomically updates `pathway` and custom overrides in `user_profiles`, updates `nutrition_goals`, and preserves 100% of historical intake and workout logs.
* **Response (200 OK):** Updated `UserProfile` and `NutritionGoals`.

---

## 4. Food Catalog & Search (`/api/v1/foods`)

### 4.1 Search Food Database
* **Endpoint:** `GET /api/v1/foods/search`
* **Auth Required:** Yes (or optional for public demonstration)
* **Query Parameters:**
  - `q` (string, optional): Search query matching food name, alternate names, brand, or regional aliases.
  - `category` (string, optional): Enum category filter (`All`, `Protein Sources`, `Indian Breads & Roti`, etc.).
  - `limit` (integer, default 50, max 100).
  - `offset` (integer, default 0).
* **Implementation:** Executes PostgreSQL trigram fuzzy match with strict multi-tenant isolation:
  ```sql
  WHERE (is_custom_user_food = FALSE OR created_by_user_id = :current_user_id)
    AND (name ILIKE '%' || :q || '%' OR alternate_names::text ILIKE '%' || :q || '%')
    AND (:category = 'All' OR category = :category)
  ```
  *(Public system foods are accessible by all users; private custom foods are visible exclusively to the author).*
* **Response (200 OK):**
```json
{
  "items": [
    {
      "id": "food-roti",
      "name": "Whole Wheat Phulka / Roti (No Oil)",
      "alternateNames": ["Chapati", "Phulka", "Roti"],
      "brandOrSource": "ICMR-NIN Indian Food Reference",
      "category": "Indian Breads & Roti",
      "cuisineRegion": "Pan-Indian",
      "preparationState": "cooked",
      "referenceQuantity": 100,
      "referenceUnit": "g",
      "referenceLabel": "100g cooked (~2.8 rotis)",
      "gramsPerServing": 35,
      "ediblePortionPct": 100,
      "nutrients": {
        "calories": 104,
        "proteinG": 3.8,
        "carbsG": 20.5,
        "fatG": 0.8,
        "fiberG": 3.7,
        "sugarG": 0.1,
        "sodiumMg": 5,
        "potassiumMg": 112,
        "calciumMg": 13,
        "ironMg": 1.3
      },
      "isMicronutrientComplete": true,
      "dataNote": "Standard medium phulka ~35g cooked."
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### 4.2 Create Custom Food Item
* **Endpoint:** `POST /api/v1/foods/custom`
* **Auth Required:** Yes
* **Request Body:** Custom `FoodItem` schema with `isCustomUserFood = true`. Automatically associates `created_by_user_id = current_user.id`.
* **Response (201 Created):** Created `FoodItem`.

### 4.3 Delete Custom Food Item
* **Endpoint:** `DELETE /api/v1/foods/custom/{food_id}`
* **Auth Required:** Yes
* **Validation & Security:** Verifies `food_item.created_by_user_id == current_user.id` and `food_item.is_custom_user_food == TRUE`. System reference foods cannot be deleted (`403 Forbidden`).
* **Foreign Key Behavior:** Any existing historical logs in `intake_records` referencing this food have `food_id` set to `NULL` via `ON DELETE SET NULL`, preserving the user's historical nutritional log.
* **Response (204 No Content).**

---

## 5. Meal Intake Logging (`/api/v1/intake`)

### 5.1 Get Daily Intake Records
* **Endpoint:** `GET /api/v1/intake/daily`
* **Auth Required:** Yes
* **Query Parameters:**
  - `date_iso` (string, format `YYYY-MM-DD`, required): Target local date.
* **Response (200 OK):**
```json
{
  "dateIso": "2026-11-24",
  "records": [
    {
      "id": "intake-uuid-1",
      "foodId": "food-roti",
      "foodName": "Whole Wheat Phulka / Roti (No Oil)",
      "category": "Indian Breads & Roti",
      "meal": "Lunch",
      "quantity": 2,
      "unit": "serving",
      "loggedAt": "13:15",
      "dateIso": "2026-11-24",
      "computedNutrients": {
        "calories": 73,
        "proteinG": 2.7,
        "carbsG": 14.4,
        "fatG": 0.6,
        "fiberG": 2.6,
        "sodiumMg": 4
      },
      "isUserLogged": true
    }
  ],
  "dailyTotals": {
    "calories": 1740,
    "proteinG": 138.5,
    "carbsG": 192.0,
    "fatG": 56.0,
    "waterMl": 2400
  }
}
```

### 5.2 Log New Intake Record
* **Endpoint:** `POST /api/v1/intake/records`
* **Auth Required:** Yes
* **Request Body:**
```json
{
  "foodId": "food-roti",
  "meal": "Lunch",
  "quantity": 2,
  "unit": "serving",
  "dateIso": "2026-11-24",
  "timeLogged": "13:15"
}
```
* **Server Logic:**
  1. Fetches base `food_item` and reference nutrients.
  2. Calculates scaled nutrients via deterministic ratio formula:
     $$\text{ratio} = \frac{\text{quantity} \times \text{gramsPerUnit}}{\text{referenceQuantity}}$$
  3. Writes immutable snapshot into `intake_records`.
* **Response (201 Created):** Full `IntakeRecord` with server-computed snapshot nutrients.

### 5.3 Delete Intake Record
* **Endpoint:** `DELETE /api/v1/intake/records/{record_id}`
* **Auth Required:** Yes
* **Validation:** Verifies `intake_record.user_id == current_user.id` (returns `403 Forbidden` on mismatch).
* **Response (204 No Content).**

### 5.4 Get Rolling Historical Reports
* **Endpoint:** `GET /api/v1/intake/reports`
* **Auth Required:** Yes
* **Query Parameters:** `days` (integer, default 7, max 90).
* **Response (200 OK):** Array of daily adherence objects with total calories, macros, target deltas, and compliance flags.

---

## 6. Workouts & Set Tracking (`/api/v1/workouts`)

### 6.1 Get Pathway Workout Templates
* **Endpoint:** `GET /api/v1/workouts/plans`
* **Auth Required:** Yes
* **Query Parameters:** `pathway` (optional filter).
* **Response (200 OK):** List of `WorkoutPlan` objects containing ordered `ExerciseItem` definitions.

### 6.2 Instantiate / Log Workout Session
* **Endpoint:** `POST /api/v1/workouts/sessions`
* **Auth Required:** Yes
* **Request Body:**
```json
{
  "workoutPlanId": "plan-upper-power",
  "sessionTitle": "Upper Body Hypertrophy & Power",
  "dateLogged": "2026-11-24",
  "durationMinutes": 52,
  "caloriesBurned": 340,
  "rpe": 8,
  "notes": "Felt strong on bench press; completed all sets.",
  "completed": true
}
```
* **Response (201 Created):** Created `WorkoutSession` with UUID.

### 6.3 Update Exercise Set Logs (Set-by-Set Checklist)
* **Endpoint:** `PUT /api/v1/workouts/sessions/{session_id}/sets`
* **Auth Required:** Yes
* **Request Body:**
```json
{
  "setLogs": [
    {
      "exerciseItemId": "ex-bench-press",
      "exerciseName": "Barbell Incline Bench Press",
      "setNumber": 1,
      "targetReps": "8-10",
      "targetLoadKg": 70.0,
      "actualReps": 10,
      "actualLoadKg": 70.0,
      "completed": true
    },
    {
      "exerciseItemId": "ex-bench-press",
      "exerciseName": "Barbell Incline Bench Press",
      "setNumber": 2,
      "targetReps": "8-10",
      "targetLoadKg": 72.5,
      "actualReps": 8,
      "actualLoadKg": 72.5,
      "completed": true
    }
  ]
}
```
* **Behavior:** Upserts `exercise_set_logs` rows within a single ACID transaction.
* **Response (200 OK):** List of confirmed `ExerciseSetLog` entities.

---

## 7. Progress & Biometrics (`/api/v1/progress`)

### 7.1 Get Progress Records (28-Day Filtered)
* **Endpoint:** `GET /api/v1/progress/records`
* **Auth Required:** Yes
* **Query Parameters:** `days` (integer, default 28).
* **Response (200 OK):** Chronological array of `ProgressRecord` items containing weight, body fat %, waist/chest/arm/thigh circumferences, and logged calorie intake.

### 7.2 Log Biometric Checkpoint
* **Endpoint:** `POST /api/v1/progress/records`
* **Auth Required:** Yes
* **Request Body:**
```json
{
  "dateLogged": "2026-11-24",
  "label": "Week 4 Progress Check",
  "weightKg": 73.6,
  "bodyFatPct": 14.8,
  "waistCm": 81.0,
  "chestCm": 101.5,
  "armCm": 37.0
}
```
* **Response (201 Created):** Created `ProgressRecord`.

---

## 8. AI Coaching & Recommendations (`/api/v1/ai`)

### 8.1 Multi-Turn Conversational Coaching
* **Endpoint:** `POST /api/v1/ai/chat`
* **Auth Required:** Yes
* **Request Body:**
```json
{
  "message": "What should I eat for dinner to reach my protein target without blowing my calories?"
}
```
* **Backend Processing:**
  1. Aggregates today's logged intake totals, remaining calorie/protein targets, active pathway, and recent training session.
  2. Synthesizes a system prompt injecting exact quantitative context.
  3. Calls Google Gemini API (or runs deterministic heuristic fallback if API key is not configured).
  4. Parses response into conversational prose + typed `CoachStructuredInsight`.
  5. Saves turn in `chat_messages`.
* **Response (200 OK):**
```json
{
  "id": "msg-uuid-99",
  "role": "assistant",
  "timestamp": "2026-11-24T15:45:00Z",
  "content": "For your Athlete Performance plan, you have 540 kcal and 36g of protein remaining today...",
  "structuredInsight": {
    "title": "Suggested Dinner Balance",
    "summary": "160g Salmon Fillet + 200g Baked Sweet Potato (~510 kcal · 39g Protein)",
    "metrics": [
      {
        "label": "Calories Left",
        "current": "1,740 kcal logged",
        "target": "540 kcal remaining",
        "status": "optimal"
      },
      {
        "label": "Protein Left",
        "current": "138g logged",
        "target": "36g to go",
        "status": "attention"
      }
    ],
    "suggestedAction": {
      "label": "Open Food Log",
      "targetTab": "diet"
    }
  },
  "isMockResponse": false
}
```
