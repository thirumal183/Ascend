"""ASCEND Platform Domain Enumerations.

Standard string-based enums matching frontend TypeScript types and database CHECK constraints.
"""

from enum import StrEnum


class PathwayType(StrEnum):
    GENERAL_NUTRITION = "General Nutrition & Diet"
    ATHLETE_PERFORMANCE = "Athlete Performance"
    MUSCLE_GAIN = "Weight Gain & Muscle Gain"


class Archetype(StrEnum):
    GENERAL_FITNESS = "General Fitness & Lifestyle"
    ATHLETE_PERFORMANCE = "Athlete Performance"


class GoalType(StrEnum):
    WEIGHT_LOSS = "Weight Loss"
    WEIGHT_MAINTENANCE = "Weight Maintenance"
    MUSCLE_GAIN = "Weight & Muscle Gain"
    ATHLETIC_PERFORMANCE = "Athletic Performance"


class BiologicalSex(StrEnum):
    MALE = "male"
    FEMALE = "female"
    UNSPECIFIED = "unspecified"


class UnitSystem(StrEnum):
    METRIC = "Metric (kg, cm, ml)"
    IMPERIAL = "Imperial (lb, in, oz)"


class ActivityLevel(StrEnum):
    SEDENTARY = "Sedentary"
    LIGHTLY_ACTIVE = "Lightly Active"
    MODERATELY_ACTIVE = "Moderately Active"
    VERY_ACTIVE = "Very Active"
    EXTREMELY_ACTIVE = "Extremely Active"


class PreparationState(StrEnum):
    RAW = "raw"
    COOKED = "cooked"
    PACKAGED = "packaged"
    COMPOSITE_DISH = "composite_dish"


class MealType(StrEnum):
    BREAKFAST = "Breakfast"
    LUNCH = "Lunch"
    SNACKS = "Snacks"
    DINNER = "Dinner"


class ServingUnit(StrEnum):
    GRAM = "g"
    OUNCE = "oz"
    SERVING = "serving"
    MILLILITER = "ml"
    CUP = "cup"


class WorkoutIntensity(StrEnum):
    LOW = "Low"
    MODERATE = "Moderate"
    HIGH = "High"
    PEAK = "Peak Performance"


class ChatRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class NutrientCategory(StrEnum):
    MACRONUTRIENT = "macronutrient"
    MINERAL = "mineral"
    VITAMIN = "vitamin"
    ELECTROLYTE = "electrolyte"
