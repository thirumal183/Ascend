"""Shared data types for ASCEND food-data ingestion and validation."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


VALID_SOURCE_PROVIDERS = frozenset({
    "usda_fdc",
    "open_food_facts",
    "ascend_recipe_estimate",
    "user_custom",
    "legacy_demo",
})

VALID_VERIFICATION_STATUSES = frozenset({
    "lab_verified",
    "label_reported",
    "recipe_estimated",
    "user_entered",
    "unverified",
})

VALID_PREPARATION_STATES = frozenset({
    "raw",
    "cooked",
    "packaged",
    "composite_dish",
})


@dataclass
class NormalizedFoodRecord:
    """Canonical normalized food record ready for validation and transactional upsert."""

    name: str
    brand_or_source: str
    category: str
    source_provider: str
    source_external_id: str
    license_type: str
    verification_status: str
    source_attribution: str
    preparation_state: str = "cooked"
    reference_quantity: float = 100.0
    reference_unit: str = "g"
    reference_label: str = "100g"
    grams_per_serving: float = 100.0
    edible_portion_pct: float = 100.0
    cuisine_region: Optional[str] = None
    alternate_names: List[str] = field(default_factory=list)
    barcode: Optional[str] = None
    code: Optional[str] = None
    data_note: Optional[str] = None
    is_micronutrient_complete: bool = False
    # Mapping of canonical nutrient code -> float amount per reference_quantity.
    # Unmeasured micronutrients MUST be omitted or None (never coerced to 0).
    nutrients: Dict[str, Optional[float]] = field(default_factory=dict)


@dataclass
class ValidationResult:
    """Outcome of validating a NormalizedFoodRecord."""

    is_valid: bool
    rejection_reasons: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class ImportSummary:
    """Structured summary produced by every ingestion run."""

    source_provider: str
    dataset_name: str
    import_batch_id: str
    dry_run: bool = False
    examined: int = 0
    imported: int = 0
    updated: int = 0
    rejected: int = 0
    skipped: int = 0
    warnings_count: int = 0
    rejection_samples: List[str] = field(default_factory=list)
    warning_samples: List[str] = field(default_factory=list)

    def add_rejection(self, reason: str) -> None:
        self.rejected += 1
        if len(self.rejection_samples) < 25:
            self.rejection_samples.append(reason)

    def add_warning(self, warning: str) -> None:
        self.warnings_count += 1
        if len(self.warning_samples) < 25:
            self.warning_samples.append(warning)
