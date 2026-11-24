"""Shared Non-Medical Pathway Nutrition Goal Calculator.

Implements the Phase 3 API Specification (Section 3.2) Mifflin-St Jeor BMR,
TDEE multipliers, pathway baselines, safety floors/ceilings, and deficit/surplus caps.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from app.models.enums import ActivityLevel, BiologicalSex, GoalType, PathwayType

ACTIVITY_MULTIPLIERS: dict[ActivityLevel, float] = {
    ActivityLevel.SEDENTARY: 1.2,
    ActivityLevel.LIGHTLY_ACTIVE: 1.375,
    ActivityLevel.MODERATELY_ACTIVE: 1.55,
    ActivityLevel.VERY_ACTIVE: 1.725,
    ActivityLevel.EXTREMELY_ACTIVE: 1.9,
}

DEFAULT_PROTEIN_PER_KG: dict[PathwayType, float] = {
    PathwayType.GENERAL_NUTRITION: 1.8,
    PathwayType.ATHLETE_PERFORMANCE: 2.2,
    PathwayType.MUSCLE_GAIN: 2.1,
}


def compute_recommended_targets(
    *,
    weight_kg: float,
    height_cm: float,
    age: int,
    biological_sex: BiologicalSex,
    activity_level: ActivityLevel,
    pathway: PathwayType,
    goal_type: GoalType,
    custom_calorie_adjustment: Optional[int] = None,
    custom_protein_per_kg: Optional[float] = None,
) -> tuple[int, Decimal, Decimal, Decimal, int, Decimal, Decimal]:
    """Computes (calories, protein_g, carbs_g, fat_g, water_ml, protein_g_per_kg, water_ml_per_kg)."""
    # 1. Mifflin-St Jeor BMR
    if biological_sex == BiologicalSex.MALE:
        bmr = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age) + 5.0
    elif biological_sex == BiologicalSex.FEMALE:
        bmr = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age) - 161.0
    else:
        bmr = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age) - 78.0

    # 2. TDEE
    tdee = bmr * ACTIVITY_MULTIPLIERS.get(activity_level, 1.55)

    # 3. Pathway / Goal Calorie Adjustment
    if custom_calorie_adjustment is not None:
        raw_adjustment = float(custom_calorie_adjustment)
    elif goal_type == GoalType.WEIGHT_LOSS:
        raw_adjustment = -420.0
    elif goal_type == GoalType.MUSCLE_GAIN or pathway == PathwayType.MUSCLE_GAIN:
        raw_adjustment = 350.0
    elif goal_type == GoalType.ATHLETIC_PERFORMANCE or pathway == PathwayType.ATHLETE_PERFORMANCE:
        raw_adjustment = 200.0
    else:
        raw_adjustment = 0.0

    # 4. Deficit & Surplus Safety Caps (25% or -750 kcal deficit; 15% or +500 kcal surplus)
    if raw_adjustment < 0:
        max_deficit = min(tdee * 0.25, 750.0)
        clamped_adjustment = -min(abs(raw_adjustment), max_deficit)
    elif raw_adjustment > 0:
        max_surplus = min(tdee * 0.15, 500.0)
        clamped_adjustment = min(raw_adjustment, max_surplus)
    else:
        clamped_adjustment = 0.0

    # 5. Caloric Floor (1200 female / 1500 male or unspecified) & Ceiling (6000)
    calorie_floor = 1200 if biological_sex == BiologicalSex.FEMALE else 1500
    target_calories = int(round(tdee + clamped_adjustment))
    target_calories = max(calorie_floor, min(6000, target_calories))

    # 6. Protein (1.2 - 2.5 g/kg safe boundary)
    base_protein_per_kg = (
        custom_protein_per_kg
        if custom_protein_per_kg is not None
        else DEFAULT_PROTEIN_PER_KG.get(pathway, 1.8)
    )
    protein_per_kg = max(1.2, min(2.5, float(base_protein_per_kg)))
    protein_g = round(Decimal(str(weight_kg * protein_per_kg)), 1)

    # 7. Fat (25% of target calories) & Carbs (remaining calories)
    fat_cals = target_calories * 0.25
    fat_g = round(Decimal(str(fat_cals / 9.0)), 1)
    carb_cals = max(0.0, target_calories - (float(protein_g) * 4.0 + float(fat_g) * 9.0))
    carbs_g = round(Decimal(str(carb_cals / 4.0)), 1)

    # 8. Hydration (36 ml/kg + 450 ml for Athlete Performance)
    water_ml_per_kg = Decimal("36.0")
    water_ml = int(round(weight_kg * 36.0)) + (450 if pathway == PathwayType.ATHLETE_PERFORMANCE else 0)

    return (
        target_calories,
        protein_g,
        carbs_g,
        fat_g,
        water_ml,
        Decimal(str(round(protein_per_kg, 2))),
        water_ml_per_kg,
    )
