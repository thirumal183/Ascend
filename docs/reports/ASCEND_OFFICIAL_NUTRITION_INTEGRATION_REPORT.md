# ASCEND — Official Nutrition Data Integration & Production Catalogue Report

**Date:** 2026-11-25
**Base Commit:** `ec290396fcbd41e81ffc37f7bf85a85bd35426f5` (`main`)
**Scope:** Local implementation, isolated local PostgreSQL 18 verification, and documentation updates. **Neon production was NOT modified, migrated, or seeded; nothing was deployed, committed, or pushed.**

---

## 1. Alembic Migration & Schema Changes
- **Migration Revision:** `e7f8a9b0c1d2` (`backend/alembic/versions/e7f8a9b0c1d2_phase7_food_provenance_and_source_metadata.py`), chaining from `d4e5f6a7b8c9`.
- **Verified Reversibility:** Tested `alembic upgrade head` -> `e7f8a9b0c1d2 (head)`, `alembic downgrade -1` -> `d4e5f6a7b8c9`, and `alembic upgrade head` -> `e7f8a9b0c1d2 (head)` on isolated local PostgreSQL 18 (`localhost:5434/ascend_test`).
- **Columns Added to `food_items`:** `source_provider`, `source_external_id`, `license_type`, `verification_status`, `source_attribution`, `barcode`, `import_batch_id`, `updated_at`.
- **Constraints & Index:** `ck_food_source_provider`, `ck_food_verification_status`, and partial unique index `uq_food_items_source_identity` on `(source_provider, source_external_id) WHERE is_custom_user_food = false AND source_external_id IS NOT NULL`.
- **3NF & Snapshot Integrity:** `food_nutrients` remains pure 3NF (unmeasured micronutrients omitted/`null`); `intake_records` immutable snapshots are untouched.

---

## 2. Ingestion Pipeline & Seeder Modules Created
- `backend/app/db/ingest/__init__.py`
- `backend/app/db/ingest/types.py`
- `backend/app/db/ingest/validation.py`
- `backend/app/db/ingest/upsert.py`
- `backend/app/db/ingest/usda_adapter.py`
- `backend/app/db/ingest/off_adapter.py`
- `backend/app/db/ingest/recipe_adapter.py` & `backend/app/db/ingest/recipes_indian.json`
- `backend/app/db/ingest/workout_seeder.py`
- `backend/app/db/ingest/cli.py`
- `.gitignore`: Added `backend/data/` so downloaded raw archives are excluded from Git.

---

## 3. Official Dataset Acquisition & Local Import Counts (`ascend_test`)

| Source | Archive / Input | Examined | Imported / Created | Rejected | Warnings |
| :--- | :--- | ---: | ---: | ---: | ---: |
| USDA FoodData Central (Foundation) | `FoodData_Central_foundation_food_json_2026-10-29.zip` (696,866 bytes) | 424 | 364 | 60 *(missing `ENERC_KCAL`)* | 0 |
| USDA FoodData Central (SR Legacy) | `FoodData_Central_sr_legacy_food_json_2018-04.zip` (13,456,312 bytes) | 7,793 | 7,793 | 0 | 75 *(Atwater energy variance on alcohol/special items)* |
| ASCEND Indian Recipe Estimates | `backend/app/db/ingest/recipes_indian.json` | 15 | 15 | 0 | 0 |
| System Workout Templates | `workout_seeder.py` (3 pathways) | 3 plans / 12 exercises | 3 plans / 12 exercises | 0 | 0 |

**Verified `verify-counts` Totals in Local PostgreSQL 18 (`ascend_test`):**
- Canonical `nutrients`: **10**
- Public `food_items`: **8,172** (`usda_fdc`: 8,157; `ascend_recipe_estimate`: 15)
- `food_nutrients` rows: **78,236**
- System `workout_plans`: **3** (`exercise_items`: **12**)

### Open Food Facts & ICMR-NIN Status
- **Open Food Facts:** Live fetch attempts (`world.openfoodfacts.org/country/india/1.json` and `/api/v2/search`) returned **HTTP 503 Service Temporarily Unavailable** during this session (`NO_OFF_PRODUCTS_DOWNLOADED`). `off_adapter.py` is implemented and unit-tested (`test_usda_and_off_adapters_parse_and_normalize_units`), ready for manual archive download + `import-off`.
- **ICMR-NIN / IFCT:** Not redistributed; 15 common Indian dishes are represented as documented `ascend_recipe_estimate` entries, and all demo fallback `ICMR-NIN` / `verified_reference` labels in `src/data/mockData.ts` were reclassified to `legacy_demo` / `demonstration`.

---

## 4. Backend & Frontend Integration
- **Backend API:** `FoodItemResponse` (`backend/app/schemas/nutrition.py`) and `map_food_item_response` (`backend/app/services/nutrition_service.py`) now return `sourceProvider`, `sourceExternalId`, `licenseType`, `verificationStatus`, `sourceAttribution`, and `barcode`. Custom foods created via `POST /foods/custom` automatically record `source_provider="user_custom"`, `license_type="User-Private"`, `verification_status="user_entered"`.
- **Frontend UI & Types:**
  - `src/types/ascend.ts`, `src/services/api/nutritionApi.ts`, `src/services/api/mappers.ts`: Added `SourceProvider`, expanded `VerificationStatus`, and mapped live provenance metadata.
  - `src/components/diet/DietManagementView.tsx`: Displays source badges (`USDA FDC`, `Open Food Facts (ODbL)`, `Recipe Estimate`, `Custom Food`, `Demo Baseline`).
  - `src/components/diet/FoodDetailsModal.tsx`: Displays verified status, license type, source ID, and full `sourceAttribution`.
  - `src/components/landing/LandingPageView.tsx`: Added **Food Data Sources & Attribution** section covering USDA FDC (CC0), Open Food Facts (ODbL 1.0), and ASCEND culinary recipe estimates.
  - `src/data/mockData.ts`: Reclassified all prototype fallback foods to `sourceProvider: 'legacy_demo'` and `verificationStatus: 'demonstration'`.

---

## 5. Verification Results (All Executed After Final Code Edits)
- **Frontend TypeScript (`npm.cmd run lint`):** Passed (`tsc --noEmit`, exit code 0).
- **Frontend Production Build (`npm.cmd run build`):** Passed (`vite build`, 2105 modules transformed, exit code 0).
- **Frontend Dependency Audit (`npm.cmd audit --audit-level=moderate`):** Passed (**0 vulnerabilities**).
- **Backend Test Suite (`pytest tests/ -v` against `localhost:5434/ascend_test`):** **63 passed in 11.41s** (0 failed, 0 skipped), including `backend/tests/test_ingestion.py`.
- **Vercel Proxy Unit Tests (`npx.cmd tsx scripts/test_phase6_5_2_vercel_proxy.ts`):** **16/16 passed**.
- **Batch 7 E2E Integration (`scripts/test_batch7_integration.ts` against local Uvicorn + PG18):** **44/44 passed**.
- **Batch 8 Security & Isolation Audit (`scripts/test_batch8_security_audit.ts`):** **22/22 passed**.
- **Batch 8 Multi-Pathway Journeys (`scripts/test_batch8_pathways.ts`):** **33/33 passed**.

---

## 6. Next Actions (Awaiting User Approval)
1. Review `git status` and diffs, then commit & push to `main` when ready.
2. During production deployment on Neon/Render, run `alembic upgrade head` and execute the `backend/app/db/ingest/cli.py` commands with `--target-db production --confirm-production` to seed `usda_fdc`, `ascend_recipe_estimate`, and system `workout_plans` (plus `import-off` once an Open Food Facts export is downloaded).
