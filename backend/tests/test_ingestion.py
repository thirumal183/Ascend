"""Comprehensive Tests for Food Ingestion Pipeline, Provenance Schema, Workout Seeder & API."""

from __future__ import annotations

import json
import math
import uuid
from decimal import Decimal
from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.database import async_session_factory
from app.db.ingest.off_adapter import parse_off_archive
from app.db.ingest.recipe_adapter import parse_recipe_file
from app.db.ingest.types import NormalizedFoodRecord
from app.db.ingest.upsert import upsert_food_records
from app.db.ingest.usda_adapter import parse_usda_archive
from app.db.ingest.validation import validate_food_record
from app.db.ingest.workout_seeder import seed_system_workout_templates
from app.models.enums import PathwayType
from app.models.nutrition import FoodItem, FoodNutrient
from app.models.user import User
from app.models.workout import WorkoutPlan
from app.services.nutrition_service import ensure_canonical_nutrients


def test_validation_rejects_invalid_and_preserves_null_micros():
    """Validates NaN/Inf/negative rejection and NULL preservation for missing micronutrients."""
    bad_neg = NormalizedFoodRecord(
        name="Bad Negative",
        brand_or_source="USDA",
        category="Produce",
        source_provider="usda_fdc",
        source_external_id="bad-1",
        license_type="CC0-1.0",
        verification_status="lab_verified",
        source_attribution="USDA",
        nutrients={"ENERC_KCAL": 50.0, "PROCNT": -1.0},
    )
    res_neg = validate_food_record(bad_neg)
    assert not res_neg.is_valid
    assert any("Negative" in r for r in res_neg.rejection_reasons)

    bad_nan = NormalizedFoodRecord(
        name="Bad NaN",
        brand_or_source="USDA",
        category="Produce",
        source_provider="usda_fdc",
        source_external_id="bad-2",
        license_type="CC0-1.0",
        verification_status="lab_verified",
        source_attribution="USDA",
        nutrients={"ENERC_KCAL": math.nan},
    )
    res_nan = validate_food_record(bad_nan)
    assert not res_nan.is_valid
    assert any("Non-finite" in r for r in res_nan.rejection_reasons)

    good_partial = NormalizedFoodRecord(
        name="Good Partial Micros",
        brand_or_source="USDA",
        category="Produce",
        source_provider="usda_fdc",
        source_external_id="good-1",
        license_type="CC0-1.0",
        verification_status="lab_verified",
        source_attribution="USDA",
        nutrients={"ENERC_KCAL": 80.0, "PROCNT": 2.0, "CHOCDF": 18.0, "FAT": 0.2, "K": None},
    )
    res_good = validate_food_record(good_partial)
    assert res_good.is_valid


def test_usda_and_off_adapters_parse_and_normalize_units(tmp_path: Path):
    """Tests USDA JSON parsing and Open Food Facts g->mg & kJ->kcal conversions."""
    usda_file = tmp_path / "usda_sample.json"
    usda_file.write_text(
        json.dumps({
            "FoundationFoods": [
                {
                    "fdcId": 999001,
                    "description": "Oats, raw",
                    "dataType": "Foundation",
                    "foodCategory": {"description": "Cereal Grains and Pasta"},
                    "foodPortions": [{"gramWeight": 40.0, "portionDescription": "1/2 cup"}],
                    "foodNutrients": [
                        {"nutrient": {"number": "208", "unitName": "kcal"}, "amount": 389},
                        {"nutrient": {"number": "203", "unitName": "g"}, "amount": 16.9},
                        {"nutrient": {"number": "205", "unitName": "g"}, "amount": 66.3},
                        {"nutrient": {"number": "204", "unitName": "g"}, "amount": 6.9},
                    ],
                }
            ]
        }),
        encoding="utf-8",
    )
    usda_recs = list(parse_usda_archive(usda_file))
    assert len(usda_recs) == 1
    assert usda_recs[0].source_provider == "usda_fdc"
    assert usda_recs[0].source_external_id == "999001"
    assert usda_recs[0].preparation_state == "raw"
    assert usda_recs[0].grams_per_serving == 40.0
    assert usda_recs[0].nutrients.get("NA") is None

    off_file = tmp_path / "off_sample.jsonl"
    off_file.write_text(
        json.dumps({
            "code": "8901234567890",
            "product_name": "Amul Taaza Milk",
            "brands": "Amul",
            "countries_tags": ["en:india"],
            "nutriments": {
                "energy_100g": 251.04,  # ~60 kcal in kJ
                "proteins_100g": 3.0,
                "carbohydrates_100g": 4.7,
                "fat_100g": 3.0,
                "sodium_100g": 0.045,  # 45 mg
            },
        }) + "\n",
        encoding="utf-8",
    )
    off_recs = list(parse_off_archive(off_file, country_filter="india"))
    assert len(off_recs) == 1
    assert off_recs[0].source_provider == "open_food_facts"
    assert off_recs[0].license_type == "ODbL-1.0 / DbCL-1.0"
    assert off_recs[0].verification_status == "label_reported"
    assert off_recs[0].nutrients["ENERC_KCAL"] == pytest.approx(60.0, abs=0.2)
    assert off_recs[0].nutrients["NA"] == pytest.approx(45.0, abs=0.1)


@pytest.mark.asyncio
async def test_idempotent_upsert_dedup_source_isolation_and_custom_protection():
    """Verifies idempotent upsert preserves UUIDs, separates sources, and never touches custom foods."""
    ext_id = f"test-fdc-{uuid.uuid4().hex[:8]}"
    async with async_session_factory() as db:
        await ensure_canonical_nutrients(db)
        user = User(
            email=f"ingest_owner_{uuid.uuid4().hex[:8]}@ascend.io",
            password_hash="hash",
            full_name="Ingest Owner",
        )
        db.add(user)
        await db.flush()

        custom_food = FoodItem(
            name="User Secret Shake",
            brand_or_source="Custom",
            category="Protein Sources",
            reference_quantity=Decimal("100.0"),
            reference_unit="g",
            reference_label="100g",
            grams_per_serving=Decimal("100.0"),
            is_custom_user_food=True,
            created_by_user_id=user.id,
            source_provider="user_custom",
            source_external_id=ext_id,
            license_type="User-Private",
            verification_status="user_entered",
        )
        db.add(custom_food)
        await db.commit()
        custom_id = custom_food.id

        rec_v1 = NormalizedFoodRecord(
            name="Test Apple Raw",
            brand_or_source="USDA FoodData Central",
            category="Produce",
            source_provider="usda_fdc",
            source_external_id=ext_id,
            license_type="CC0-1.0",
            verification_status="lab_verified",
            source_attribution="USDA",
            preparation_state="raw",
            nutrients={"ENERC_KCAL": 52.0, "PROCNT": 0.3, "CHOCDF": 13.8, "FAT": 0.2},
        )
        # Include duplicate in same batch + same external_id under OFF (must stay separate!)
        rec_off = NormalizedFoodRecord(
            name="Test Apple Packaged",
            brand_or_source="OFF",
            category="Produce",
            source_provider="open_food_facts",
            source_external_id=ext_id,
            license_type="ODbL-1.0 / DbCL-1.0",
            verification_status="label_reported",
            source_attribution="OFF",
            preparation_state="packaged",
            nutrients={"ENERC_KCAL": 55.0, "PROCNT": 0.3, "CHOCDF": 14.0, "FAT": 0.2},
        )

        s1 = await upsert_food_records(
            db, [rec_v1, rec_v1], source_provider="usda_fdc", dataset_name="t1", import_batch_id="b1"
        )
        assert s1.imported == 1
        assert s1.skipped == 1

        s_off = await upsert_food_records(
            db, [rec_off], source_provider="open_food_facts", dataset_name="t_off", import_batch_id="b1"
        )
        assert s_off.imported == 1

        row_v1 = await db.scalar(
            select(FoodItem).where(
                FoodItem.source_provider == "usda_fdc",
                FoodItem.source_external_id == ext_id,
            )
        )
        assert row_v1 is not None
        first_uuid = row_v1.id

        # Repeat import updates in place while preserving UUID and leaving custom_food untouched
        rec_v2 = NormalizedFoodRecord(
            name="Test Apple Raw Updated",
            brand_or_source="USDA FoodData Central",
            category="Produce",
            source_provider="usda_fdc",
            source_external_id=ext_id,
            license_type="CC0-1.0",
            verification_status="lab_verified",
            source_attribution="USDA",
            preparation_state="raw",
            nutrients={"ENERC_KCAL": 53.0, "PROCNT": 0.3, "CHOCDF": 14.0, "FAT": 0.2},
        )
        s2 = await upsert_food_records(
            db, [rec_v2], source_provider="usda_fdc", dataset_name="t1", import_batch_id="b2"
        )
        assert s2.updated == 1

        row_v2 = await db.get(FoodItem, first_uuid)
        assert row_v2 is not None
        assert row_v2.name == "Test Apple Raw Updated"

        still_custom = await db.get(FoodItem, custom_id)
        assert still_custom is not None
        assert still_custom.name == "User Secret Shake"
        assert still_custom.source_provider == "user_custom"


@pytest.mark.asyncio
async def test_workout_seeder_idempotent_and_preserves_user_plans():
    """Seeds all 3 pathway system templates idempotently without touching user plans."""
    async with async_session_factory() as db:
        user = User(
            email=f"wseed_{uuid.uuid4().hex[:8]}@ascend.io",
            password_hash="hash",
            full_name="Workout User",
        )
        db.add(user)
        await db.flush()
        user_plan = WorkoutPlan(
            title="My Custom Plan",
            day_label="Custom",
            focus_area="Upper",
            estimated_minutes=30,
            intensity_label="Moderate",
            target_calories_burned=200,
            is_system_template=False,
            created_by_user_id=user.id,
        )
        db.add(user_plan)
        await db.commit()
        user_plan_id = user_plan.id

        s1 = await seed_system_workout_templates(db)
        s2 = await seed_system_workout_templates(db)
        assert s2.plans_created == 0
        assert s2.plans_existing == 3

        still_user_plan = await db.get(WorkoutPlan, user_plan_id)
        assert still_user_plan is not None
        assert still_user_plan.title == "My Custom Plan"


@pytest.mark.asyncio
async def test_api_food_provenance_and_recipes_endpoint(async_client: AsyncClient):
    """Verifies /foods/search and /foods/{id} expose provenance metadata."""
    async with async_session_factory() as db:
        await upsert_food_records(
            db,
            list(parse_recipe_file())[:2],
            source_provider="ascend_recipe_estimate",
            dataset_name="recipes_indian.json",
            import_batch_id="test_api_rec",
        )

    res = await async_client.get("/api/v1/foods/search", params={"q": "Dal Tadka"})
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 1
    dal = items[0]
    assert dal["sourceProvider"] == "ascend_recipe_estimate"
    assert dal["verificationStatus"] == "recipe_estimated"
    assert dal["sourceExternalId"] == "dal-tadka"

    detail = await async_client.get(f"/api/v1/foods/{dal['id']}")
    assert detail.status_code == 200
    assert detail.json()["sourceAttribution"] is not None
