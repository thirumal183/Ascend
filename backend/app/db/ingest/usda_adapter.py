"""USDA FoodData Central (FDC) JSON/ZIP ingestion adapter (Public Domain / CC0 1.0)."""

from __future__ import annotations

import json
import zipfile
from pathlib import Path
from typing import Any, Iterator, Optional

from app.db.ingest.types import NormalizedFoodRecord
from app.db.ingest.validation import infer_preparation_state

# Map USDA nutrient numbers / IDs to ASCEND canonical nutrient codes
USDA_NUTRIENT_NUMBER_MAP: dict[str, str] = {
    "208": "ENERC_KCAL",   # Energy (kcal)
    "957": "ENERC_KCAL",   # Energy (Atwater General Factors)
    "958": "ENERC_KCAL",   # Energy (Atwater Specific Factors)
    "203": "PROCNT",       # Protein (g)
    "205": "CHOCDF",       # Carbohydrate, by difference (g)
    "204": "FAT",          # Total lipid (fat) (g)
    "291": "FIBTG",        # Fiber, total dietary (g)
    "269": "SUGAR",        # Sugars, total including NLEA (g)
    "307": "NA",           # Sodium, Na (mg)
    "306": "K",            # Potassium, K (mg)
    "301": "CA",           # Calcium, Ca (mg)
    "303": "FE",           # Iron, Fe (mg)
}

USDA_ATTRIBUTION = (
    "U.S. Department of Agriculture, Agricultural Research Service. "
    "FoodData Central (https://fdc.nal.usda.gov/). Public Domain (CC0 1.0)."
)


def _map_usda_category(raw_cat: str) -> str:
    lower = (raw_cat or "").lower()
    if any(k in lower for k in ("poultry", "beef", "pork", "finfish", "shellfish", "lamb", "egg", "legume", "nut", "seed")):
        return "Protein Sources"
    if any(k in lower for k in ("dairy", "milk", "cheese", "yogurt")):
        return "Dairy & Alternatives"
    if any(k in lower for k in ("cereal", "grain", "pasta", "rice", "oat", "baked", "bread")):
        return "Grains & Oats"
    if any(k in lower for k in ("vegetable", "fruit", "produce")):
        return "Produce"
    return "Prepared Meals"


def _iter_usda_json_items(archive_path: Path) -> Iterator[dict[str, Any]]:
    if archive_path.suffix.lower() == ".zip":
        with zipfile.ZipFile(archive_path, "r") as zf:
            json_names = [n for n in zf.namelist() if n.lower().endswith(".json")]
            for name in json_names:
                with zf.open(name) as fh:
                    payload = json.load(fh)
                    for item in _extract_food_list(payload):
                        yield item
    else:
        with archive_path.open("r", encoding="utf-8") as fh:
            payload = json.load(fh)
            for item in _extract_food_list(payload):
                yield item


def _extract_food_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("FoundationFoods", "SRLegacyFoods", "SurveyFoods", "BrandedFoods", "foods"):
            if isinstance(payload.get(key), list):
                return payload[key]
    return []


def parse_usda_archive(
    archive_path: Path,
    *,
    dataset_label: str = "USDA FoodData Central",
    limit: Optional[int] = None,
) -> Iterator[NormalizedFoodRecord]:
    """Parses a USDA FoodData Central JSON or ZIP archive into NormalizedFoodRecords."""
    count = 0
    for item in _iter_usda_json_items(archive_path):
        if limit is not None and count >= limit:
            break

        fdc_id = item.get("fdcId")
        description = (item.get("description") or "").strip()
        if not fdc_id or not description:
            continue

        raw_category = ""
        if isinstance(item.get("foodCategory"), dict):
            raw_category = item["foodCategory"].get("description") or ""
        elif isinstance(item.get("foodCategory"), str):
            raw_category = item["foodCategory"]

        nutrients: dict[str, Optional[float]] = {}
        kcal_priority = -1
        for fn in item.get("foodNutrients") or []:
            n_meta = fn.get("nutrient") or {}
            num = str(n_meta.get("number") or "")
            unit = (n_meta.get("unitName") or "").lower()
            amount = fn.get("amount")
            if amount is None:
                continue

            canonical = USDA_NUTRIENT_NUMBER_MAP.get(num)
            if not canonical:
                continue

            val = float(amount)
            if canonical == "ENERC_KCAL":
                # Prefer direct 208 (kcal) over 957/958 Atwater factors
                prio = 3 if num == "208" else (2 if num == "957" else 1)
                if unit == "kj":
                    val = val / 4.184
                if prio > kcal_priority:
                    nutrients["ENERC_KCAL"] = round(val, 2)
                    kcal_priority = prio
            else:
                # Normalize mg vs g if needed
                if canonical in ("NA", "K", "CA", "FE") and unit == "g":
                    val *= 1000.0
                elif canonical in ("NA", "K", "CA", "FE") and unit == "ug":
                    val /= 1000.0
                nutrients[canonical] = round(val, 3)

        grams_per_serving = 100.0
        serving_note: Optional[str] = None
        portions = item.get("foodPortions") or []
        if portions and isinstance(portions[0], dict):
            gw = portions[0].get("gramWeight")
            if isinstance(gw, (int, float)) and gw > 0:
                grams_per_serving = round(float(gw), 2)
                portion_desc = portions[0].get("portionDescription") or portions[0].get("modifier") or ""
                if portion_desc:
                    serving_note = f"Portion ref: {portion_desc} ({grams_per_serving}g)"

        prep_state = infer_preparation_state(description, default="cooked")
        data_type = item.get("dataType") or dataset_label
        is_foundation = data_type.lower() == "foundation"
        verification_status = "lab_verified" if is_foundation else "unverified"
        attribution = (
            "U.S. Department of Agriculture, Agricultural Research Service. "
            f"FoodData Central, {data_type} (https://fdc.nal.usda.gov/). Public Domain (CC0 1.0)."
        )
        default_note = (
            f"Official Foundation Foods analytical reference (FDC ID {fdc_id})."
            if is_foundation
            else f"Official SR Legacy (2018-04) compiled reference — mixed analytical, calculated & formulation values (FDC ID {fdc_id})."
        )

        count += 1
        yield NormalizedFoodRecord(
            code=f"FDC-{fdc_id}",
            name=description,
            alternate_names=[raw_category] if raw_category else [],
            brand_or_source=f"USDA FoodData Central ({data_type})",
            category=_map_usda_category(raw_category or description),
            cuisine_region="Global / Western",
            preparation_state=prep_state,
            reference_quantity=100.0,
            reference_unit="g",
            reference_label=f"100g {prep_state}",
            grams_per_serving=grams_per_serving,
            edible_portion_pct=100.0,
            data_note=serving_note or default_note,
            source_provider="usda_fdc",
            source_external_id=str(fdc_id),
            license_type="CC0-1.0",
            verification_status=verification_status,
            source_attribution=attribution,
            nutrients=nutrients,
        )
