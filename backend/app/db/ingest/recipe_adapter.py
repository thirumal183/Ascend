"""ASCEND Indian Composite Dish Recipe Estimate Adapter.

Produces explicitly labeled recipe_estimated records with documented ingredient
weights and cooking yield assumptions. Never misrepresents estimates as
official ICMR-NIN laboratory measurements.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterator

from app.db.ingest.types import NormalizedFoodRecord

DEFAULT_RECIPES_PATH = Path(__file__).resolve().parent / "recipes_indian.json"

RECIPE_ATTRIBUTION = (
    "ASCEND Documented Recipe Estimate (computed from standard whole-ingredient "
    "composition and cooking yield factors; not an official ICMR-NIN laboratory assay)."
)


def parse_recipe_file(recipe_path: Path = DEFAULT_RECIPES_PATH) -> Iterator[NormalizedFoodRecord]:
    """Parses documented Indian recipe estimates JSON into NormalizedFoodRecords."""
    with recipe_path.open("r", encoding="utf-8") as fh:
        recipes = json.load(fh)

    for item in recipes:
        slug = str(item["id"]).strip()
        ingredients_note = "; ".join(item.get("ingredientsSummary") or [])
        yield_note = item.get("yieldAssumption") or ""
        note_parts = [p for p in (ingredients_note, yield_note) if p]
        data_note = " | ".join(note_parts) if note_parts else "Documented recipe-based nutritional estimate."

        nutrients = {
            k: (float(v) if v is not None else None)
            for k, v in (item.get("nutrientsPer100g") or {}).items()
        }

        yield NormalizedFoodRecord(
            code=f"REC-{slug}",
            name=item["name"],
            alternate_names=item.get("alternateNames") or [],
            brand_or_source="ASCEND Recipe Estimate",
            category=item.get("category") or "Prepared Meals",
            cuisine_region=item.get("cuisineRegion") or "Pan-Indian",
            preparation_state=item.get("preparationState") or "composite_dish",
            reference_quantity=float(item.get("referenceQuantity", 100.0)),
            reference_unit=item.get("referenceUnit") or "g",
            reference_label=item.get("referenceLabel") or "100g cooked recipe",
            grams_per_serving=float(item.get("gramsPerServing", 150.0)),
            edible_portion_pct=100.0,
            data_note=data_note,
            source_provider="ascend_recipe_estimate",
            source_external_id=slug,
            license_type="ASCEND Recipe Estimate",
            verification_status="recipe_estimated",
            source_attribution=RECIPE_ATTRIBUTION,
            nutrients=nutrients,
        )
