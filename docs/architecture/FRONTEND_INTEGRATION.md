# ASCEND — Frontend Integration Specification & Contract Mapping

**Document Version:** 1.0.0  
**Target Clients:** React 19 / TypeScript 5 / Vite  
**Service Layer:** `src/services/ascendApiService.ts`  
**Status:** Approved Architectural Design (Phase 3)  
**Author:** Principal Frontend Architect & Integration Engineer  

---

## 1. Integration Overview

Currently, the ASCEND frontend manages state in `src/App.tsx` and persists it via `prototypeSessionStorage` (localStorage). The service layer `src/services/ascendApiService.ts` defines mathematical functions (Mifflin-St Jeor formulas, portion scaling, daily totals aggregation) and declares the target REST endpoints in `FASTAPI_ENDPOINTS_SPEC`.

The production integration will connect `ascendApiService.ts` directly to the FastAPI backend while preserving:
1. **The Instant Demo Experience:** Users who launch the demo can explore the complete application offline without registration.
2. **Deterministic Error Handling:** When a user is logged into the backend, network and server errors must display actionable notifications rather than silently falling back to mock data.
3. **Multi-Pathway Consistency:** Pathway switching immediately syncs with the backend without losing existing logs.

---

## 2. Type & Schema Contract Mapping

Every frontend TypeScript interface maps to an equivalent Pydantic v2 schema on the backend.

### 2.1 User Profile & Nutrition Goals

| Frontend TypeScript (`types/ascend.ts`) | Backend Pydantic Schema (`schemas/user.py`) | Database Table & Columns | Field Mapping & Notes |
| :--- | :--- | :--- | :--- |
| `UserProfile.pathway` | `UserProfileRead.pathway` | `user_profiles.pathway` | Direct 1:1 match with `OnboardingPathway` string values. |
| `UserProfile.archetype` | `UserProfileRead.archetype` | `user_profiles.archetype` | Direct 1:1 match with `ProfileArchetype`. |
| `UserProfile.goalType` | `UserProfileRead.goal_type` | `user_profiles.goal_type` | CamelCase $\to$ snake_case conversion handled by Pydantic alias generator. |
| `UserProfile.biologicalSex` | `UserProfileRead.biological_sex` | `user_profiles.biological_sex` | `'male' \| 'female' \| 'unspecified'`. |
| `UserProfile.currentWeightKg` | `UserProfileRead.current_weight_kg` | `user_profiles.current_weight_kg` | Canonical metric weight stored in `NUMERIC(5,2)`. |
| `UserProfile.targetWeightKg` | `UserProfileRead.target_weight_kg` | `user_profiles.target_weight_kg` | Canonical metric target weight. |
| `UserProfile.heightCm` | `UserProfileRead.height_cm` | `user_profiles.height_cm` | Canonical metric height stored in `NUMERIC(5,2)`. |
| `UserProfile.unitSystem` | `UserProfileRead.unit_system` | `user_profiles.unit_system` | Display preference only; all DB values are stored in SI units. |
| `NutritionGoals.dailyCalories` | `NutritionGoalsRead.daily_calories` | `nutrition_goals.daily_calories` | Daily caloric target integer. |
| `NutritionGoals.proteinG` | `NutritionGoalsRead.protein_g` | `nutrition_goals.protein_g` | Target protein in grams (`NUMERIC(5,1)`). |
| `NutritionGoals.waterMl` | `NutritionGoalsRead.water_ml` | `nutrition_goals.water_ml` | Target water intake in milliliters. |

### 2.2 Food Catalog & Intake Records

| Frontend TypeScript (`types/ascend.ts`) | Backend Pydantic Schema (`schemas/nutrition.py`) | Database Table & Columns | Field Mapping & Notes |
| :--- | :--- | :--- | :--- |
| `FoodItem.id` | `FoodItemRead.id` | `food_items.id` | String UUID. |
| `FoodItem.name` | `FoodItemRead.name` | `food_items.name` | Food common display name. |
| `FoodItem.alternateNames` | `FoodItemRead.alternate_names` | `food_items.alternate_names` | Array of strings (`TEXT[]`). |
| `FoodItem.brandOrSource` | `FoodItemRead.brand_or_source` | `food_items.brand_or_source` | Provenance label. |
| `FoodItem.nutrients` | `FoodItemRead.nutrients` | Joined from `food_nutrients` + `nutrients` | Structured object containing `calories`, `proteinG`, `carbsG`, `fatG`, etc. |
| `IntakeRecord.id` | `IntakeRecordRead.id` | `intake_records.id` | Unique intake record UUID. |
| `IntakeRecord.foodId` | `IntakeRecordRead.food_id` | `intake_records.food_id` | Foreign key referencing `food_items(id)`. |
| `IntakeRecord.quantity` | `IntakeRecordRead.quantity` | `intake_records.quantity` | User logged numeric quantity. |
| `IntakeRecord.unit` | `IntakeRecordRead.unit` | `intake_records.unit` | Serving unit (`'g' \| 'serving' \| 'oz' \| 'cup'`). |
| `IntakeRecord.computedNutrients` | `IntakeRecordRead.computed_nutrients` | Flattened snapshot columns in `intake_records` | Server computes and returns frozen snapshot values. |

### 2.3 Workout Execution & Set Logging

| Frontend TypeScript (`types/ascend.ts`) | Backend Pydantic Schema (`schemas/workout.py`) | Database Table & Columns | Field Mapping & Notes |
| :--- | :--- | :--- | :--- |
| `WorkoutPlan.id` | `WorkoutPlanRead.id` | `workout_plans.id` | Template UUID. |
| `ExerciseItem.completedSets` | `ExerciseSetLogRead[]` | Joined from `exercise_set_logs` | Array of set completion records. |
| `ExerciseSetLog.setNum` | `ExerciseSetLogRead.set_number` | `exercise_set_logs.set_number` | 1-indexed set identifier. |
| `ExerciseSetLog.actualReps` | `ExerciseSetLogRead.actual_reps` | `exercise_set_logs.actual_reps` | Actual executed repetitions. |
| `ExerciseSetLog.actualLoadKg` | `ExerciseSetLogRead.actual_load_kg` | `exercise_set_logs.actual_load_kg` | Actual load lifted in kilograms. |
| `ExerciseSetLog.completed` | `ExerciseSetLogRead.completed` | `exercise_set_logs.completed` | Boolean completion flag triggering rest timer. |

---

## 3. Operations & API Service Mapping

The functions in `src/services/ascendApiService.ts` map to backend endpoints as follows:

| Client Operation | HTTP Method | REST Route | Backend Service Action |
| :--- | :---: | :--- | :--- |
| User Sign In | `POST` | `/api/v1/auth/token` | Validates credentials via Argon2id; returns JWT access + refresh tokens. |
| User Registration | `POST` | `/api/v1/auth/register` | Creates `users`, `user_profiles`, and `nutrition_goals` rows in single transaction. |
| Pathway Switching | `POST` | `/api/v1/users/me/pathway` | Updates pathway and recomputes macro goals; preserves all intake/workout history. |
| Food Search | `GET` | `/api/v1/foods/search?q={query}&category={cat}` | Executes PostgreSQL trigram GIN search across names and alternate aliases. |
| Log Meal Item | `POST` | `/api/v1/intake/records` | Calculates scaled nutrients on server; saves immutable snapshot in `intake_records`. |
| Delete Logged Meal | `DELETE` | `/api/v1/intake/records/{id}` | Deletes record verifying user ownership. |
| Load Day Meals | `GET` | `/api/v1/intake/daily?date_iso={date}` | Fetches user intake records strictly filtered by date; computes day totals. |
| Load 7-Day Reports | `GET` | `/api/v1/intake/reports?days=7` | Aggregates daily adherence matrix for rolling 7-day reporting. |
| Complete Workout | `POST` | `/api/v1/workouts/sessions` | Saves workout session execution record. |
| Save Set Logs | `PUT` | `/api/v1/workouts/sessions/{id}/sets` | Upserts set-by-set weight and repetition tracking rows. |
| Record Progress | `POST` | `/api/v1/progress/records` | Inserts daily biometric measurements (weight, circumferences, body fat). |
| AI Coach Interaction | `POST` | `/api/v1/ai/chat` | Dispatches message to Gemini API with user context; returns structured insight. |

---

## 4. Frontend Migration Strategy: From Prototype to Live Backend

### 4.1 Authenticated HTTP Client Layer

A modern, type-safe API client wrapper (`src/services/httpClient.ts`) will replace raw localStorage calls:

```typescript
// Proposed HTTP client structure for Phase 4
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredAccessToken();
  const headers = new Headers(options.headers || {});
  
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Attempt token refresh or redirect to login modal
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      return apiRequest<T>(endpoint, options);
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `HTTP ${response.status}: Request failed`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
```

### 4.2 Strict Error Handling (No Silent Fallbacks)

- **Rule:** When `account.isAuthenticated === true` and `VITE_API_BASE_URL` is defined, network failures or HTTP 4xx/5xx responses **must never** silently fall back to `prototypeSessionStorage` or `SAMPLE_FOOD_DATABASE`.
- **Reason:** Silent fallback confuses users, causes phantom data desynchronization, and prevents errors from being caught during QA.
- **UI Presentation:** Failed requests surface a visible toast or banner alert (e.g., *"Unable to save meal to server. Please check your connection."*) with a retry action.

### 4.3 Preserving the Instant Demo Experience

- When the user clicks **"Instant Demo"**, `account.isDemoAccount` is set to `true`.
- In demo mode, all operations read and write to `mockData.ts` and `prototypeSessionStorage` in the browser, allowing prospective users to evaluate the application without running a backend or creating credentials.
- When the user registers or logs in with real credentials, the application transitions to the live API client.
