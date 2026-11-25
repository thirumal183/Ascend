"""Open Food Facts (OFF) JSON/JSONL/GZIP ingestion adapter (ODbL 1.0 / DbCL 1.0)."""

from __future__ import annotations

import gzip
import json
from pathlib import Path
from typing import Any, Iterator, Optional

from app.db.ingest.types import NormalizedFoodRecord

OFF_ATTRIBUTION = (
    "Contains data from Open Food Facts (https://world.openfoodfacts.org/), "
    "available under the Open Database License (ODbL 1.0) and DbCL 1.0."
)


def _map_off_category(categories_str: str, product_name: str) -> str:
    text = f"{categories_str} {product_name}".lower()
    if any(k in text for k in ("milk", "yogurt", "curd", "paneer", "cheese", "dairy")):
        return "Dairy & Alternatives"
    if any(k in text for k in ("protein", "whey", "meat", "chicken", "fish", "egg", "tofu", "dal", "lentil")):
        return "Protein Sources"
    if any(k in text for k in ("oat", "rice", "bread", "cereal", "biscuit", "roti", "atta", "flour")):
        return "Grains & Oats"
    if any(k in text for k in ("fruit", "vegetable", "produce")):
        return "Produce"
    if any(k in text for k in ("supplement", "electrolyte", "bar")):
        return "Sports Supplements"
    return "Prepared Meals"


def _iter_off_items(archive_path: Path) -> Iterator[dict[str, Any]]:
    suffix = archive_path.suffix.lower()
    if suffix == ".gz":
        with gzip.open(archive_path, "rt", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue
    elif suffix == ".jsonl":
        with archive_path.open("r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue
    else:
        with archive_path.open("r", encoding="utf-8", errors="replace") as fh:
            payload = json.load(fh)
            if isinstance(payload, list):
                for item in payload:
                    if isinstance(item, dict):
                        yield item
            elif isinstance(payload, dict) and isinstance(payload.get("products"), list):
                for item in payload["products"]:
                    if isinstance(item, dict):
                        yield item


def _num(val: Any) -> Optional[float]:
    if val is None or isinstance(val, bool):
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def parse_off_archive(
    archive_path: Path,
    *,
    country_filter: Optional[str] = None,
    limit: Optional[int] = None,
) -> Iterator[NormalizedFoodRecord]:
    """Parses Open Food Facts product exports into NormalizedFoodRecords.

    Preserves ODbL 1.0 / DbCL 1.0 attribution and keeps OFF records isolated
    from USDA CC0 records via source_provider='open_food_facts'.
    """
    count = 0
    for item in _iter_off_items(archive_path):
        if limit is not None and count >= limit:
            break

        code = str(item.get("code") or item.get("_id") or "").strip()
        name = (item.get("product_name") or item.get("product_name_en") or "").strip()
        if not code or not name:
            continue

        if country_filter:
            cf = country_filter.lower()
            countries = [str(c).lower() for c in (item.get("countries_tags") or [])]
            countries_str = str(item.get("countries") or "").lower()
            if not any(cf in c for c in countries) and cf not in countries_str:
                continue

        nutriments = item.get("nutriments") or {}
        if not isinstance(nutriments, dict):
            continue

        kcal = _num(nutriments.get("energy-kcal_100g"))
        if kcal is None:
            kj = _num(nutriments.get("energy_100g")) or _num(nutriments.get("energy-kj_100g"))
            if kj is not None:
                kcal = round(kj / 4.184, 2)

        prot = _num(nutriments.get("proteins_100g"))
        carbs = _num(nutriments.get("carbohydrates_100g"))
        fat = _num(nutriments.get("fat_100g"))
        if kcal is None or prot is None or carbs is None or fat is None:
            continue

        nutrients: dict[str, Optional[float]] = {
            "ENERC_KCAL": round(kcal, 2),
            "PROCNT": round(prot, 3),
            "CHOCDF": round(carbs, 3),
            "FAT": round(fat, 3),
        }

        fiber = _num(nutriments.get("fiber_100g"))
        if fiber is not None:
            nutrients["FIBTG"] = round(fiber, 3)

        sugar = _num(nutriments.get("sugars_100g"))
        if sugar is not None:
            nutrients["SUGAR"] = round(sugar, 3)

        # OFF stores minerals in grams per 100g; convert to mg
        sodium_g = _num(nutriments.get("sodium_100g"))
        if sodium_g is not None:
            nutrients["NA"] = round(sodium_g * 1000.0, 2)
        else:
            salt_g = _num(nutriments.get("salt_100g"))
            if salt_g is not None:
                nutrients["NA"] = round((salt_g / 2.5) * 1000.0, 2)

        for off_key, code_key in (("potassium_100g", "K"), ("calcium_100g", "CA"), ("iron_100g", "FE")):
            mineral_g = _num(nutriments.get(off_key))
            if mineral_g is not None:
                nutrients[code_key] = round(mineral_g * 1000.0, 2)

        brands = (item.get("brands") or "Open Food Facts Branded").strip()
        categories_str = str(item.get("categories") or "")
        serving_qty = _num(item.get("serving_quantity"))
        grams_per_serving = round(serving_qty, 2) if serving_qty and 1.0 <= serving_qty <= 2000.0 else 100.0

        is_india = any("india" in str(c).lower() for c in (item.get("countries_tags") or []))
        cuisine_region = "Pan-Indian" if is_india else "Global / Western"

        count += 1
        yield NormalizedFoodRecord(
            code=f"OFF-{code}",
            name=name[:200],
            alternate_names=[brands] if brands and brands.lower() != name.lower() else [],
            brand_or_source=f"{brands} (Open Food Facts)",
            category=_map_off_category(categories_str, name),
            cuisine_region=cuisine_region,
            preparation_state="packaged",
            reference_quantity=100.0,
            reference_unit="g",
            reference_label="100g packaged",
            grams_per_serving=grams_per_serving,
            edible_portion_pct=100.0,
            barcode=code[:32],
            data_note=f"Packaged food declaration from Open Food Facts (barcode {code}).",
            source_provider="open_food_facts",
            source_external_id=code,
            license_type="ODbL-1.0 / DbCL-1.0",
            verification_status="label_reported",
            source_attribution=OFF_ATTRIBUTION,
            nutrients=nutrients,
        )
