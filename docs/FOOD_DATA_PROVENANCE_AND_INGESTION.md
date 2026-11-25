# ASCEND — Food Data Provenance & Ingestion Architecture

## 1. Runtime Isolation Principle
ASCEND **never calls external food APIs during user search or meal logging**. Official nutrition datasets are downloaded offline, validated, normalized to `per 100g` (or exact serving reference), and stored in PostgreSQL (`food_items` + `food_nutrients`). Runtime searches query only ASCEND's PostgreSQL database, and `intake_records` store immutable nutrient snapshots at log time.

---

## 2. Source Isolation & Licensing Boundaries

| `source_provider` | Dataset / Origin | `license_type` | `verification_status` | Attribution & Usage Notes |
| :--- | :--- | :--- | :--- | :--- |
| `usda_fdc` | USDA FoodData Central (Foundation Foods & SR Legacy) | `Public Domain (CC0)` | `verified_reference` | Primary nutritional baseline; preserves `fdcId` in `source_external_id`. |
| `open_food_facts` | Open Food Facts packaged/branded exports | `ODbL 1.0 / DbCL 1.0` | `packaged_label` | Preserves barcode (`source_external_id` & `barcode`) and ODbL attribution; strictly isolated from USDA CC0 records. |
| `ascend_recipe_estimate` | Curated Indian & regional mixed-dish estimates | `ASCEND Culinary Estimate` | `estimated_recipe` | Calculated from standardized ingredient weights (`recipes_indian.json`) where official redistributable tables are unavailable. |
| `user_custom` | User-created private foods (`POST /foods/custom`) | `User-Private` | `user_entered` | Strictly scoped to `created_by_user_id`; protected from public ingestion overwrites. |
| `legacy_demo` | Frontend offline demo fallback (`mockData.ts`) | `Curated Prototype / Demo` | `demonstration` | Client-only preview data when unauthenticated; never written to PostgreSQL. |

### ICMR-NIN / IFCT Boundary
ICMR-NIN Indian Food Composition Tables (IFCT) are **not** bundled or redistributed in ASCEND due to licensing/redistribution restrictions. Indian dishes in `recipes_indian.json` are transparently labeled `ascend_recipe_estimate` (`estimated_recipe`), never as official ICMR-NIN entries.

---

## 3. Database Provenance Schema (`e7f8a9b0c1d2`)
Added to `food_items`:
- `source_provider` (indexed, constrained via `ck_food_source_provider`)
- `source_external_id` (nullable external ID such as USDA `fdcId` or OFF barcode)
- `license_type`, `verification_status` (constrained via `ck_food_verification_status`), `source_attribution`, `barcode`, `import_batch_id`, `updated_at`
- Partial unique index `uq_food_items_source_identity` on `(source_provider, source_external_id) WHERE is_custom_user_food = false AND source_external_id IS NOT NULL`

---

## 4. Ingestion Pipeline (`backend/app/db/ingest/`)
- **`types.py`**: `NormalizedFoodRecord`, `ImportStats`, canonical nutrient codes.
- **`validation.py`**: Rejects missing/negative required macros, checks Atwater caloric consistency (warns on >30% variance except alcohol/special matrices), and preserves `None` for unmeasured micronutrients (never coerces missing micros to `0`).
- **`usda_adapter.py`**: Streams `.json` or `.zip` USDA Foundation Foods and SR Legacy archives.
- **`off_adapter.py`**: Streams `.json`, `.jsonl`, or `.jsonl.gz` Open Food Facts exports, converts `kJ -> kcal` (`/ 4.184`) and `sodium g -> mg` (`* 1000`), and supports `--country` filtering.
- **`recipe_adapter.py` + `recipes_indian.json`**: Loads 15 documented Indian staple recipe estimates.
- **`upsert.py`**: Idempotent PostgreSQL `INSERT ... ON CONFLICT (source_provider, source_external_id)` upsert that updates public records cleanly without touching `is_custom_user_food = true` rows.
- **`workout_seeder.py`**: Idempotently seeds 3 system pathway workout plans (`General Nutrition & Diet`, `Athlete Performance`, `Weight Gain & Muscle Gain`) with 12 exercises without modifying user-created plans.
- **`cli.py`**: Safe CLI requiring `--target-db local|production` and `--confirm-production` for non-local targets.
