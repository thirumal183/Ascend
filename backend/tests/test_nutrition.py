"""Comprehensive Test Suite for Nutrition Catalog, Pure 3NF Bridge, and Meal Intake Snapshots."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.enums import (
    ActivityLevel,
    BiologicalSex,
    GoalType,
    NutrientCategory,
    PathwayType,
    PreparationState,
    UnitSystem,
)
from app.models.nutrition import FoodItem, FoodNutrient, IntakeRecord, Nutrient
from app.models.user import NutritionGoal, User
from app.services.nutrition_service import (
    FoodService,
    IntakeService,
    ensure_canonical_nutrients,
)


# --- Unit Tests: Portion Scaling & Nutrient Precision ---

def test_portion_scaling_serving_unit():
    """Verifies that 2.5 servings of a food with 40g per serving scales correctly against 100g reference."""
    food = FoodItem(
        name="Rolled Oats",
        brand_or_source="Standard Library",
        category="Grains",
        reference_quantity=Decimal("100.0"),
        grams_per_serving=Decimal("40.0"),
        reference_unit="g",
        reference_label="100g",
        edible_portion_pct=Decimal("100.0"),
    )
    # Mock attached nutrients: 380 kcal, 13g protein, 68g carbs, 7g fat per 100g
    n_cals = Nutrient(code="ENERC_KCAL", name="Calories", unit="kcal", category=NutrientCategory.MACRONUTRIENT)
    n_prot = Nutrient(code="PROCNT", name="Protein", unit="g", category=NutrientCategory.MACRONUTRIENT)
    n_carb = Nutrient(code="CHOCDF", name="Carbs", unit="g", category=NutrientCategory.MACRONUTRIENT)
    n_fat = Nutrient(code="FAT", name="Fat", unit="g", category=NutrientCategory.MACRONUTRIENT)

    food.nutrients = [
        FoodNutrient(nutrient=n_cals, amount_per_reference_qty=Decimal("380.0")),
        FoodNutrient(nutrient=n_prot, amount_per_reference_qty=Decimal("13.0")),
        FoodNutrient(nutrient=n_carb, amount_per_reference_qty=Decimal("68.0")),
        FoodNutrient(nutrient=n_fat, amount_per_reference_qty=Decimal("7.0")),
    ]

    # 2.5 servings = 2.5 * 40g = 100g. Ratio should be exactly 1.0!
    scaled = IntakeService.calculate_scaled_nutrients(food, quantity=2.5, unit="serving")
    assert scaled.calories == 380
    assert scaled.proteinG == 13.0
    assert scaled.carbsG == 68.0
    assert scaled.fatG == 7.0
    assert scaled.fiberG is None  # Unmeasured nutrient represented strictly as None!


def test_portion_scaling_gram_unit_and_rounding():
    """Verifies scaling by exact gram weight (e.g. 150g when reference is 100g)."""
    food = FoodItem(
        name="Chicken Breast",
        brand_or_source="Standard Library",
        category="Protein Sources",
        reference_quantity=Decimal("100.0"),
        grams_per_serving=Decimal("100.0"),
        reference_unit="g",
        reference_label="100g",
        edible_portion_pct=Decimal("100.0"),
    )
    n_cals = Nutrient(code="ENERC_KCAL", name="Calories", unit="kcal", category=NutrientCategory.MACRONUTRIENT)
    n_prot = Nutrient(code="PROCNT", name="Protein", unit="g", category=NutrientCategory.MACRONUTRIENT)
    n_na = Nutrient(code="NA", name="Sodium", unit="mg", category=NutrientCategory.MINERAL)

    food.nutrients = [
        FoodNutrient(nutrient=n_cals, amount_per_reference_qty=Decimal("165.0")),
        FoodNutrient(nutrient=n_prot, amount_per_reference_qty=Decimal("31.0")),
        FoodNutrient(nutrient=n_na, amount_per_reference_qty=Decimal("74.0")),
    ]

    # 150g -> ratio = 1.5
    # calories = 165 * 1.5 = 247.5 -> 248 kcal
    # protein = 31 * 1.5 = 46.5g
    # sodium = 74 * 1.5 = 111.0mg
    scaled = IntakeService.calculate_scaled_nutrients(food, quantity=150.0, unit="g")
    assert scaled.calories == 248
    assert scaled.proteinG == 46.5
    assert scaled.sodiumMg == 111.0


def test_portion_scaling_serving_referenced_food_no_inflation():
    """AUD-P1-06: Serving-referenced foods (reference_unit='serving') must not inflate by grams_per_serving."""
    from app.core.exceptions import ValidationException

    food = FoodItem(
        name="Whey Isolate Scoop",
        brand_or_source="Supplement",
        category="Protein Sources",
        reference_quantity=Decimal("1.0"),
        grams_per_serving=Decimal("30.0"),
        reference_unit="serving",
        reference_label="1 scoop (30g)",
        edible_portion_pct=Decimal("100.0"),
    )
    n_cals = Nutrient(code="ENERC_KCAL", name="Calories", unit="kcal", category=NutrientCategory.MACRONUTRIENT)
    n_prot = Nutrient(code="PROCNT", name="Protein", unit="g", category=NutrientCategory.MACRONUTRIENT)
    food.nutrients = [
        FoodNutrient(nutrient=n_cals, amount_per_reference_qty=Decimal("120.0")),
        FoodNutrient(nutrient=n_prot, amount_per_reference_qty=Decimal("25.0")),
    ]

    scaled_1_serving = IntakeService.calculate_scaled_nutrients(food, quantity=1.0, unit="serving")
    assert scaled_1_serving.calories == 120
    assert scaled_1_serving.proteinG == 25.0

    scaled_15_grams = IntakeService.calculate_scaled_nutrients(food, quantity=15.0, unit="g")
    assert scaled_15_grams.calories == 60
    assert scaled_15_grams.proteinG == 12.5

    with pytest.raises(ValidationException):
        IntakeService.calculate_scaled_nutrients(food, quantity=1.0, unit="cup")


# --- Helper Fixture for Authenticated Users ---

async def create_test_user_and_token(async_client: AsyncClient, email_prefix: str) -> dict:
    """Helper creating a test user and returning registration auth payload."""
    suffix = uuid.uuid4().hex[:8]
    email = f"{email_prefix}_{suffix}@ascend.io"
    password = "StrongPassword123!"

    reg_payload = {
        "email": email,
        "password": password,
        "fullName": f"Tester {email_prefix}",
        "pathway": PathwayType.GENERAL_NUTRITION.value,
        "archetype": "General Fitness & Lifestyle",
        "goalType": GoalType.WEIGHT_LOSS.value,
        "biologicalSex": BiologicalSex.FEMALE.value,
        "currentWeightKg": 65.0,
        "targetWeightKg": 60.0,
        "heightCm": 165.0,
        "age": 28,
        "activityLevel": ActivityLevel.MODERATELY_ACTIVE.value,
        "unitSystem": UnitSystem.METRIC.value,
        "trainingDaysPerWeek": 4,
    }
    res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    return res.json()


# --- Integration Tests: Food Catalog & Search ---

@pytest.mark.asyncio
async def test_food_search_public_and_filtering(async_client: AsyncClient):
    """Verifies public food search without credentials and category filtering."""
    # 1. Seed reference food item directly in DB
    async with async_session_factory() as session:
        nutrient_map = await ensure_canonical_nutrients(session)
        food = FoodItem(
            name=f"Brown Basmati Rice {uuid.uuid4().hex[:6]}",
            alternate_names=["Brown Rice", "Cooked Rice"],
            brand_or_source="USDA Reference",
            category="Grains",
            preparation_state="cooked",
            reference_quantity=Decimal("100.0"),
            reference_unit="g",
            reference_label="100g cooked",
            grams_per_serving=Decimal("150.0"),
            edible_portion_pct=Decimal("100.0"),
            is_custom_user_food=False,
        )
        session.add(food)
        await session.flush()

        # Add calorie and protein bridge rows
        session.add_all([
            FoodNutrient(food_id=food.id, nutrient_id=nutrient_map["ENERC_KCAL"].id, amount_per_reference_qty=Decimal("123.0")),
            FoodNutrient(food_id=food.id, nutrient_id=nutrient_map["PROCNT"].id, amount_per_reference_qty=Decimal("2.7")),
        ])
        await session.commit()
        food_name = food.name

    # 2. Search publicly without Authorization header
    res = await async_client.get(f"/api/v1/foods/search?q={food_name}")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    found = next((item for item in data["items"] if item["name"] == food_name), None)
    assert found is not None
    assert found["nutrients"]["calories"] == 123.0
    assert found["nutrients"]["proteinG"] == 2.7
    assert found["isCustomUserFood"] is False

    # 3. Search with category filter
    cat_res = await async_client.get("/api/v1/foods/search?category=Grains")
    assert cat_res.status_code == 200
    assert cat_res.json()["total"] >= 1


@pytest.mark.asyncio
async def test_custom_food_creation_and_cross_user_isolation(async_client: AsyncClient):
    """Verifies custom food creation, ownership, and strict multi-tenant access prevention."""
    user_a = await create_test_user_and_token(async_client, "user_a")
    user_b = await create_test_user_and_token(async_client, "user_b")

    token_a = user_a["tokens"]["accessToken"]
    token_b = user_b["tokens"]["accessToken"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. User A creates private custom food
    custom_name = f"Alex Grandma Homemade Khichdi {uuid.uuid4().hex[:6]}"
    payload = {
        "name": custom_name,
        "category": "Composite Indian Dishes",
        "alternateNames": ["Khichdi", "Dal Khichdi"],
        "brandOrSource": "Home Recipe",
        "preparationState": "cooked",
        "referenceQuantity": 100.0,
        "referenceUnit": "g",
        "referenceLabel": "100g cooked",
        "gramsPerServing": 200.0,
        "ediblePortionPct": 100.0,
        "nutrients": {
            "calories": 145.0,
            "proteinG": 5.2,
            "carbsG": 24.0,
            "fatG": 3.1,
            "fiberG": 3.5,
            "sodiumMg": 220.0,
        },
        "dataNote": "Mild ghee and cumin tempering.",
    }
    create_res = await async_client.post("/api/v1/foods/custom", json=payload, headers=headers_a)
    assert create_res.status_code == 201
    created_food = create_res.json()
    food_id = created_food["id"]
    assert created_food["isCustomUserFood"] is True
    assert created_food["nutrients"]["calories"] == 145.0
    assert created_food["nutrients"]["fiberG"] == 3.5

    # 2. User A searches and sees it
    search_a = await async_client.get(f"/api/v1/foods/search?q={custom_name}", headers=headers_a)
    assert search_a.status_code == 200
    assert search_a.json()["total"] == 1

    # 3. User B searches and CANNOT see User A's custom food!
    search_b = await async_client.get(f"/api/v1/foods/search?q={custom_name}", headers=headers_b)
    assert search_b.status_code == 200
    assert search_b.json()["total"] == 0

    # 4. Public search without token CANNOT see custom food
    search_anon = await async_client.get(f"/api/v1/foods/search?q={custom_name}")
    assert search_anon.status_code == 200
    assert search_anon.json()["total"] == 0

    # 5. User B attempts direct GET /{food_id} -> 403 Forbidden!
    detail_b = await async_client.get(f"/api/v1/foods/{food_id}", headers=headers_b)
    assert detail_b.status_code == 403
    assert detail_b.json()["error"]["code"] == "FORBIDDEN"

    # 6. User B attempts DELETE /custom/{food_id} -> 403 Forbidden!
    del_b = await async_client.delete(f"/api/v1/foods/custom/{food_id}", headers=headers_b)
    assert del_b.status_code == 403

    # 7. User A deletes their own custom food -> 204 No Content
    del_a = await async_client.delete(f"/api/v1/foods/custom/{food_id}", headers=headers_a)
    assert del_a.status_code == 204


# --- Integration Tests: Meal Intake Logging & Adherence ---

@pytest.mark.asyncio
async def test_intake_logging_and_frozen_snapshot(async_client: AsyncClient):
    """Verifies intake logging, ratio calculation, and frozen nutrient snapshot preservation."""
    user = await create_test_user_and_token(async_client, "intake_user")
    token = user["tokens"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create a reference food to log
    async with async_session_factory() as session:
        nutrient_map = await ensure_canonical_nutrients(session)
        food = FoodItem(
            name=f"Greek Yogurt 0% Fat {uuid.uuid4().hex[:6]}",
            brand_or_source="ASCEND High Protein",
            category="Dairy & Alternatives",
            preparation_state="packaged",
            reference_quantity=Decimal("100.0"),
            reference_unit="g",
            reference_label="100g",
            grams_per_serving=Decimal("170.0"),
            edible_portion_pct=Decimal("100.0"),
            is_custom_user_food=False,
        )
        session.add(food)
        await session.flush()

        session.add_all([
            FoodNutrient(food_id=food.id, nutrient_id=nutrient_map["ENERC_KCAL"].id, amount_per_reference_qty=Decimal("59.0")),
            FoodNutrient(food_id=food.id, nutrient_id=nutrient_map["PROCNT"].id, amount_per_reference_qty=Decimal("10.0")),
            FoodNutrient(food_id=food.id, nutrient_id=nutrient_map["CHOCDF"].id, amount_per_reference_qty=Decimal("3.6")),
            FoodNutrient(food_id=food.id, nutrient_id=nutrient_map["FAT"].id, amount_per_reference_qty=Decimal("0.4")),
        ])
        await session.commit()
        food_id = str(food.id)

    today_str = date.today().isoformat()

    # Log 1 serving (170g)
    # Ratio = 170 / 100 = 1.7
    # calories = 59 * 1.7 = 100.3 -> 100 kcal
    # protein = 10.0 * 1.7 = 17.0g
    # carbs = 3.6 * 1.7 = 6.1g
    # fat = 0.4 * 1.7 = 0.7g
    intake_payload = {
        "foodId": food_id,
        "meal": "Breakfast",
        "quantity": 1.0,
        "unit": "serving",
        "dateIso": today_str,
        "timeLogged": "08:30",
    }
    log_res = await async_client.post("/api/v1/intake/records", json=intake_payload, headers=headers)
    assert log_res.status_code == 201
    log_data = log_res.json()
    record_id = log_data["id"]

    assert log_data["foodId"] == food_id
    assert log_data["meal"] == "Breakfast"
    assert log_data["quantity"] == 1.0
    assert log_data["unit"] == "serving"
    assert log_data["computedNutrients"]["calories"] == 100
    assert log_data["computedNutrients"]["proteinG"] == 17.0
    assert log_data["computedNutrients"]["carbsG"] == 6.1
    assert log_data["computedNutrients"]["fatG"] == 0.7

    # Retrieve daily intake
    daily_res = await async_client.get(f"/api/v1/intake/daily?date_iso={today_str}", headers=headers)
    assert daily_res.status_code == 200
    daily_data = daily_res.json()
    assert len(daily_data["records"]) == 1
    assert daily_data["dailyTotals"]["calories"] == 100
    assert daily_data["dailyTotals"]["proteinG"] == 17.0

    # Update intake record: change quantity to 2 servings
    update_res = await async_client.put(
        f"/api/v1/intake/records/{record_id}",
        json={"quantity": 2.0},
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["quantity"] == 2.0
    assert updated_data["computedNutrients"]["calories"] == 201  # 59 * 3.4 = 200.6 -> 201
    assert updated_data["computedNutrients"]["proteinG"] == 34.0

    # Delete intake record
    del_res = await async_client.delete(f"/api/v1/intake/records/{record_id}", headers=headers)
    assert del_res.status_code == 204

    # Confirm deletion from daily view
    daily_after = await async_client.get(f"/api/v1/intake/daily?date_iso={today_str}", headers=headers)
    assert daily_after.status_code == 200
    assert len(daily_after.json()["records"]) == 0
    assert daily_after.json()["dailyTotals"]["calories"] == 0


@pytest.mark.asyncio
async def test_intake_cross_user_isolation(async_client: AsyncClient):
    """Verifies that User B cannot view, modify, or delete User A's intake records."""
    user_a = await create_test_user_and_token(async_client, "owner_a")
    user_b = await create_test_user_and_token(async_client, "intruder_b")

    headers_a = {"Authorization": f"Bearer {user_a['tokens']['accessToken']}"}
    headers_b = {"Authorization": f"Bearer {user_b['tokens']['accessToken']}"}

    # User A logs a custom food
    custom_res = await async_client.post(
        "/api/v1/foods/custom",
        json={
            "name": f"Isolated Food {uuid.uuid4().hex[:6]}",
            "category": "Snacks",
            "referenceQuantity": 100.0,
            "gramsPerServing": 50.0,
            "nutrients": {"calories": 200.0, "proteinG": 10.0, "carbsG": 20.0, "fatG": 5.0},
        },
        headers=headers_a,
    )
    food_id = custom_res.json()["id"]

    intake_res = await async_client.post(
        "/api/v1/intake/records",
        json={
            "foodId": food_id,
            "meal": "Snacks",
            "quantity": 1.0,
            "unit": "serving",
            "dateIso": date.today().isoformat(),
        },
        headers=headers_a,
    )
    record_id = intake_res.json()["id"]

    # User B attempts to update User A's intake -> 403 Forbidden!
    upd_res = await async_client.put(
        f"/api/v1/intake/records/{record_id}",
        json={"quantity": 5.0},
        headers=headers_b,
    )
    assert upd_res.status_code == 403
    assert upd_res.json()["error"]["code"] == "FORBIDDEN"

    # User B attempts to delete User A's intake -> 403 Forbidden!
    del_res = await async_client.delete(
        f"/api/v1/intake/records/{record_id}",
        headers=headers_b,
    )
    assert del_res.status_code == 403
    assert del_res.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_historical_adherence_reports(async_client: AsyncClient):
    """Verifies multi-day intake adherence report comparing against user target calories."""
    user = await create_test_user_and_token(async_client, "report_user")
    token = user["tokens"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch 7-day report
    report_res = await async_client.get("/api/v1/intake/reports?days=7", headers=headers)
    assert report_res.status_code == 200
    data = report_res.json()
    assert data["days"] == 7
    assert len(data["report"]) == 7

    # Check structure of adherence items
    today_item = data["report"][-1]
    assert "dateIso" in today_item
    assert "calories" in today_item
    assert "targetCalories" in today_item
    assert "calorieDelta" in today_item
    assert "compliant" in today_item
    assert today_item["targetCalories"] > 0
