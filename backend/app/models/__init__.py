"""ASCEND ORM Domain Models Package.

Exports all 15 approved relational entities across five core domains.
"""

from app.models.chat import ChatConversation, ChatMessage
from app.models.enums import (
    ActivityLevel,
    Archetype,
    BiologicalSex,
    ChatRole,
    GoalType,
    MealType,
    NutrientCategory,
    PathwayType,
    PreparationState,
    ServingUnit,
    UnitSystem,
    WorkoutIntensity,
)
from app.models.nutrition import FoodItem, FoodNutrient, IntakeRecord, Nutrient
from app.models.progress import ProgressRecord
from app.models.user import NutritionGoal, User, UserProfile, UserRefreshSession
from app.models.views import (
    CREATE_V_FOOD_ITEMS_WITH_NUTRIENTS,
    DROP_V_FOOD_ITEMS_WITH_NUTRIENTS,
)
from app.models.workout import (
    ExerciseItem,
    ExerciseSetLog,
    WorkoutPlan,
    WorkoutSession,
)

__all__ = [
    # Domain 1: Users, Security, Demographic Profiles & Goals (4)
    "User",
    "UserRefreshSession",
    "UserProfile",
    "NutritionGoal",
    # Domain 2: Nutrition Catalog & Intake Records (4)
    "Nutrient",
    "FoodItem",
    "FoodNutrient",
    "IntakeRecord",
    # Domain 3: Workouts & Training Execution (4)
    "WorkoutPlan",
    "ExerciseItem",
    "WorkoutSession",
    "ExerciseSetLog",
    # Domain 4: Progress & Biometrics (1)
    "ProgressRecord",
    # Domain 5: AI Coaching Conversations (2)
    "ChatConversation",
    "ChatMessage",
    # Enums
    "PathwayType",
    "Archetype",
    "GoalType",
    "BiologicalSex",
    "UnitSystem",
    "ActivityLevel",
    "PreparationState",
    "MealType",
    "ServingUnit",
    "WorkoutIntensity",
    "ChatRole",
    "NutrientCategory",
    # Views
    "CREATE_V_FOOD_ITEMS_WITH_NUTRIENTS",
    "DROP_V_FOOD_ITEMS_WITH_NUTRIENTS",
]
