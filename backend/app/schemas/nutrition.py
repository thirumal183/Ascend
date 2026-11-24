"""Pydantic v2 schemas for Nutrition Catalog, Food Search, and Meal Intake Logging."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CoreNutrientsSchema(BaseModel):
    """Core macronutrients and common micronutrients per reference quantity / 100g."""

    model_config = ConfigDict(populate_by_name=True)

    calories: float = Field(default=0.0, ge=0.0)
    proteinG: float = Field(default=0.0, ge=0.0)
    carbsG: float = Field(default=0.0, ge=0.0)
    fatG: float = Field(default=0.0, ge=0.0)
    fiberG: Optional[float] = Field(default=None, ge=0.0)
    sugarG: Optional[float] = Field(default=None, ge=0.0)
    sodiumMg: Optional[float] = Field(default=None, ge=0.0)
    potassiumMg: Optional[float] = Field(default=None, ge=0.0)
    calciumMg: Optional[float] = Field(default=None, ge=0.0)
    ironMg: Optional[float] = Field(default=None, ge=0.0)


class NutrientDetailSchema(BaseModel):
    """Detailed quantitative nutrient amount with full provenance code."""

    model_config = ConfigDict(populate_by_name=True)

    code: str
    name: str
    unit: str
    category: str
    amount: float


class FoodItemResponse(BaseModel):
    """Standard projection of a catalog food item with aggregated core nutrients."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    code: Optional[str] = None
    name: str
    alternateNames: List[str] = Field(default_factory=list)
    brandOrSource: str
    category: str
    cuisineRegion: Optional[str] = None
    preparationState: str
    referenceQuantity: float
    referenceUnit: str
    referenceLabel: str
    gramsPerServing: float
    ediblePortionPct: float
    isMicronutrientComplete: bool
    isCustomUserFood: bool
    createdByUserId: Optional[uuid.UUID] = None
    dataNote: Optional[str] = None
    nutrients: CoreNutrientsSchema
    createdAt: datetime


class FoodDetailResponse(FoodItemResponse):
    """Detailed food item including complete list of attached micronutrients."""

    allNutrients: List[NutrientDetailSchema] = Field(default_factory=list)


class FoodSearchResponse(BaseModel):
    """Paginated search response for the food catalog."""

    model_config = ConfigDict(populate_by_name=True)

    items: List[FoodItemResponse]
    total: int
    limit: int
    offset: int


class CreateCustomFoodRequest(BaseModel):
    """Payload to create a user-defined custom food."""

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=1, max_length=200)
    category: str = Field(default="Custom Foods", max_length=50)
    alternateNames: List[str] = Field(default_factory=list)
    brandOrSource: str = Field(default="Custom User Food", max_length=150)
    cuisineRegion: Optional[str] = Field(default=None, max_length=50)
    preparationState: str = Field(default="cooked")
    referenceQuantity: float = Field(default=100.0, gt=0)
    referenceUnit: str = Field(default="g")
    referenceLabel: str = Field(default="100g")
    gramsPerServing: float = Field(default=100.0, gt=0)
    ediblePortionPct: float = Field(default=100.0, gt=0, le=100)
    nutrients: CoreNutrientsSchema
    dataNote: Optional[str] = None


class ComputedNutrientsResponse(BaseModel):
    """Frozen calculated nutrient snapshot for a consumed intake portion."""

    model_config = ConfigDict(populate_by_name=True)

    calories: int
    proteinG: float
    carbsG: float
    fatG: float
    fiberG: Optional[float] = None
    sodiumMg: Optional[float] = None


class IntakeRecordResponse(BaseModel):
    """User food intake consumption record with frozen computed snapshot."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    foodId: Optional[uuid.UUID] = None
    foodName: str
    category: str
    meal: str
    quantity: float
    unit: str
    loggedAt: str
    dateIso: str
    computedNutrients: ComputedNutrientsResponse
    isUserLogged: bool = True
    createdAt: datetime


class CreateIntakeRequest(BaseModel):
    """Payload to log a food portion intake."""

    model_config = ConfigDict(populate_by_name=True)

    foodId: uuid.UUID
    meal: str = Field(..., pattern=r"^(Breakfast|Lunch|Snacks|Dinner)$")
    quantity: float = Field(gt=0)
    unit: str = Field(default="serving", pattern=r"^(g|oz|serving|ml|cup)$")
    dateIso: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    timeLogged: Optional[str] = Field(default=None, max_length=10)


class UpdateIntakeRequest(BaseModel):
    """Payload to update an existing intake record."""

    model_config = ConfigDict(populate_by_name=True)

    meal: Optional[str] = Field(default=None, pattern=r"^(Breakfast|Lunch|Snacks|Dinner)$")
    quantity: Optional[float] = Field(default=None, gt=0)
    unit: Optional[str] = Field(default=None, pattern=r"^(g|oz|serving|ml|cup)$")
    dateIso: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    timeLogged: Optional[str] = Field(default=None, max_length=10)


class DailyTotalsResponse(BaseModel):
    """Aggregated daily macronutrient and energy totals."""

    model_config = ConfigDict(populate_by_name=True)

    calories: int = 0
    proteinG: float = 0.0
    carbsG: float = 0.0
    fatG: float = 0.0
    fiberG: Optional[float] = None
    sodiumMg: Optional[float] = None
    waterMl: int = 0


class DailyIntakeResponse(BaseModel):
    """Single-day intake log projection containing records and cumulative sums."""

    model_config = ConfigDict(populate_by_name=True)

    dateIso: str
    records: List[IntakeRecordResponse]
    dailyTotals: DailyTotalsResponse


class DailyAdherenceItem(BaseModel):
    """Historical daily nutrition benchmark and goal comparison."""

    model_config = ConfigDict(populate_by_name=True)

    dateIso: str
    calories: int
    proteinG: float
    carbsG: float
    fatG: float
    targetCalories: int
    targetProteinG: float
    targetCarbsG: float
    targetFatG: float
    calorieDelta: int
    compliant: bool


class IntakeReportResponse(BaseModel):
    """Rolling multi-day nutritional adherence history."""

    model_config = ConfigDict(populate_by_name=True)

    days: int
    report: List[DailyAdherenceItem]
