"""Validation and normalization helpers for ASCEND food ingestion."""

from __future__ import annotations

import math
from typing import Optional

from app.db.ingest.types import (
    VALID_PREPARATION_STATES,
    VALID_SOURCE_PROVIDERS,
    VALID_VERIFICATION_STATUSES,
    NormalizedFoodRecord,
    ValidationResult,
)

CORE_REQUIRED_MACROS = ("ENERC_KCAL", "PROCNT", "CHOCDF", "FAT")


def infer_preparation_state(description: str, default: str = "cooked") -> str:
    """Infers raw/cooked/packaged state conservatively from food description."""
    lower = (description or "").lower()
    if any(tok in lower for tok in ("raw", "uncooked", "fresh,", "dry,", "dried")):
        return "raw"
    if any(tok in lower for tok in ("cooked", "boiled", "steamed", "roasted", "grilled", "baked", "fried")):
        return "cooked"
    return default if default in VALID_PREPARATION_STATES else "cooked"


def validate_food_record(record: NormalizedFoodRecord) -> ValidationResult:
    """Validates numeric integrity, provenance invariants, and Atwater sanity."""
    reasons: list[str] = []
    warnings: list[str] = []

    if not record.name or not record.name.strip():
        reasons.append("Missing food name.")
    if not record.source_external_id or not record.source_external_id.strip():
        reasons.append("Missing source_external_id.")
    if record.source_provider not in VALID_SOURCE_PROVIDERS or record.source_provider == "user_custom":
        reasons.append(f"Invalid public ingestion source_provider: {record.source_provider}")
    if record.verification_status not in VALID_VERIFICATION_STATUSES:
        reasons.append(f"Invalid verification_status: {record.verification_status}")
    if record.preparation_state not in VALID_PREPARATION_STATES:
        reasons.append(f"Invalid preparation_state: {record.preparation_state}")
    if record.reference_quantity <= 0 or not math.isfinite(record.reference_quantity):
        reasons.append("reference_quantity must be finite and > 0.")
    if record.grams_per_serving <= 0 or not math.isfinite(record.grams_per_serving):
        reasons.append("grams_per_serving must be finite and > 0.")

    # Validate all supplied nutrient values (never coerce missing to 0)
    cleaned_nutrients: dict[str, float] = {}
    for code, val in record.nutrients.items():
        if val is None:
            continue
        if not isinstance(val, (int, float)) or math.isnan(val) or math.isinf(val):
            reasons.append(f"Non-finite nutrient value for {code}: {val}")
            continue
        if val < 0:
            reasons.append(f"Negative nutrient value for {code}: {val}")
            continue
        cleaned_nutrients[code] = float(val)

    # Require at least energy to be present
    kcal: Optional[float] = cleaned_nutrients.get("ENERC_KCAL")
    if kcal is None:
        reasons.append("Missing energy (ENERC_KCAL).")

    # Sanity bounds per 100g/100ml reference
    if record.reference_unit in ("g", "ml") and record.reference_quantity == 100.0:
        if kcal is not None and kcal > 950.0:
            reasons.append(f"Energy {kcal} kcal/100g exceeds physiological fat ceiling (950 kcal).")
        for macro in ("PROCNT", "CHOCDF", "FAT"):
            m_val = cleaned_nutrients.get(macro)
            if m_val is not None and m_val > 100.5:
                reasons.append(f"Macro {macro}={m_val}g/100g exceeds 100g.")

    # Atwater energy consistency check (report suspicious values, do NOT silently overwrite)
    if kcal is not None:
        p = cleaned_nutrients.get("PROCNT", 0.0)
        c = cleaned_nutrients.get("CHOCDF", 0.0)
        f = cleaned_nutrients.get("FAT", 0.0)
        atwater_est = 4.0 * p + 4.0 * c + 9.0 * f
        if (p + c + f) > 0 and abs(kcal - atwater_est) > max(35.0, 0.30 * max(kcal, atwater_est)):
            warnings.append(
                f"{record.source_external_id} ({record.name[:40]}): reported {kcal:.1f} kcal vs Atwater {atwater_est:.1f} kcal"
            )

    return ValidationResult(
        is_valid=len(reasons) == 0,
        rejection_reasons=reasons,
        warnings=warnings,
    )
