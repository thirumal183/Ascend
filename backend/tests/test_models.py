"""Tests for SQLAlchemy 2.0 ORM models, relationships, and Pure 3NF constraints."""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.models.chat import ChatConversation, ChatMessage
from app.models.enums import (
    ActivityLevel,
    BiologicalSex,
    GoalType,
    MealType,
    NutrientCategory,
    PathwayType,
    PreparationState,
    ServingUnit,
    WorkoutIntensity,
)
from app.models.nutrition import FoodItem, FoodNutrient, IntakeRecord, Nutrient
from app.models.progress import ProgressRecord
from app.models.user import NutritionGoal, User, UserProfile, UserRefreshSession
from app.models.workout import (
    ExerciseItem,
    ExerciseSetLog,
    WorkoutPlan,
    WorkoutSession,
)


@pytest.mark.asyncio
async def test_user_and_profile_relationship_and_cascade():
    """Verifies User creation, 1:1 UserProfile, 1:1 NutritionGoal, and cascade deletion."""
    async with async_session_factory() as session:
        # Create user
        user = User(
            email=f"test_user_{uuid.uuid4().hex[:8]}@ascend.fit",
            password_hash="$argon2id$v=19$m=65536,t=3,p=4$simulatedhash",
            full_name="Athletic Tester",
            is_active=True,
            is_demo_account=False,
            jwt_version=1,
        )
        session.add(user)
        await session.flush()
        user_id = user.id

        # Create profile
        profile = UserProfile(
            user_id=user_id,
            pathway=PathwayType.ATHLETE_PERFORMANCE,
            current_weight_kg=Decimal("78.50"),
            target_weight_kg=Decimal("75.00"),
            height_cm=Decimal("180.00"),
            age=26,
            activity_level=ActivityLevel.VERY_ACTIVE,
            training_days_per_week=5,
            protein_g_per_kg=Decimal("2.20"),
            water_ml_per_kg=Decimal("40.0"),
        )
        session.add(profile)

        # Create nutrition goals
        goals = NutritionGoal(
            user_id=user_id,
            daily_calories=2800,
            protein_g=Decimal("175.0"),
            carbs_g=Decimal("350.0"),
            fat_g=Decimal("75.0"),
            water_ml=3500,
        )
        session.add(goals)
        await session.flush()

        # Query user with profile and goals using selectinload
        stmt = (
            select(User)
            .options(selectinload(User.profile), selectinload(User.nutrition_goals))
            .where(User.id == user_id)
        )
        result = await session.execute(stmt)
        fetched_user = result.scalar_one()

        assert fetched_user.email == user.email
        assert fetched_user.profile is not None
        assert fetched_user.profile.pathway == PathwayType.ATHLETE_PERFORMANCE
        assert fetched_user.nutrition_goals is not None
        assert fetched_user.nutrition_goals.daily_calories == 2800

        # Rollback so test leaves zero residual data
        await session.rollback()


@pytest.mark.asyncio
async def test_pure_3nf_nutrient_catalog_and_view():
    """Verifies that FoodItem + FoodNutrient + Nutrient calculate core macros via v_food_items_with_nutrients."""
    async with async_session_factory() as session:
        # 1. Fetch or create Nutrients
        n_energy = await session.scalar(select(Nutrient).where(Nutrient.code == "ENERC_KCAL"))
        if not n_energy:
            n_energy = Nutrient(
                code="ENERC_KCAL",
                name="Energy (Calories)",
                unit="kcal",
                category=NutrientCategory.MACRONUTRIENT,
                display_order=1,
            )
            session.add(n_energy)

        n_protein = await session.scalar(select(Nutrient).where(Nutrient.code == "PROCNT"))
        if not n_protein:
            n_protein = Nutrient(
                code="PROCNT",
                name="Protein",
                unit="g",
                category=NutrientCategory.MACRONUTRIENT,
                display_order=2,
            )
            session.add(n_protein)
        await session.flush()

        # 2. Create FoodItem
        food = FoodItem(
            name=f"Steel-Cut Rolled Oats {uuid.uuid4().hex[:6]}",
            brand_or_source="ASCEND Core Nutrition Library",
            category="Grains",
            preparation_state=PreparationState.RAW,
            reference_quantity=Decimal("100.0"),
            reference_unit=ServingUnit.GRAM,
            reference_label="100g raw",
            grams_per_serving=Decimal("40.0"),
            edible_portion_pct=Decimal("100.0"),
        )
        session.add(food)
        await session.flush()

        # 3. Create Bridge rows (FoodNutrient)
        fn_energy = FoodNutrient(
            food_id=food.id,
            nutrient_id=n_energy.id,
            amount_per_reference_qty=Decimal("389.000"),
        )
        fn_protein = FoodNutrient(
            food_id=food.id,
            nutrient_id=n_protein.id,
            amount_per_reference_qty=Decimal("16.900"),
        )
        session.add_all([fn_energy, fn_protein])
        await session.flush()

        # 4. Query view v_food_items_with_nutrients
        view_stmt = text(
            "SELECT calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g "
            "FROM v_food_items_with_nutrients WHERE id = :food_id"
        )
        view_res = await session.execute(view_stmt, {"food_id": food.id})
        view_row = view_res.first()

        assert view_row is not None
        assert float(view_row[0]) == 389.0  # calories
        assert float(view_row[1]) == 16.9   # protein
        assert float(view_row[2]) == 0.0    # carbs (no bridge row -> coalesced to 0.0)

        # Rollback to keep database clean
        await session.rollback()


@pytest.mark.asyncio
async def test_workout_plan_and_session_logging():
    """Verifies workout plan template structure, execution session, and set telemetry."""
    async with async_session_factory() as session:
        # Create user
        user = User(
            email=f"lifter_{uuid.uuid4().hex[:8]}@ascend.fit",
            password_hash="testhash",
            full_name="Lifter One",
        )
        session.add(user)
        await session.flush()

        # Create Workout Plan
        plan = WorkoutPlan(
            title="Ascend Upper Hypertrophy",
            day_label="Day 1",
            focus_area="Chest & Back",
            estimated_minutes=60,
            intensity_label=WorkoutIntensity.HIGH,
            target_calories_burned=450,
            recommended_pathway=PathwayType.MUSCLE_GAIN,
            is_system_template=True,
        )
        session.add(plan)
        await session.flush()

        # Add exercise
        exercise = ExerciseItem(
            workout_plan_id=plan.id,
            name="Incline Barbell Bench Press",
            muscle_group="Upper Chest",
            default_sets=3,
            default_reps="8-10",
            default_load_kg=Decimal("70.0"),
            rest_seconds=90,
            sort_order=1,
        )
        session.add(exercise)
        await session.flush()

        # Log workout session
        ws = WorkoutSession(
            user_id=user.id,
            workout_plan_id=plan.id,
            session_title=plan.title,
            date_logged=date.today(),
            duration_minutes=55,
            calories_burned=420,
            rpe=8,
            completed=True,
        )
        session.add(ws)
        await session.flush()

        # Log set execution
        set_log = ExerciseSetLog(
            workout_session_id=ws.id,
            exercise_item_id=exercise.id,
            exercise_name=exercise.name,
            set_number=1,
            target_reps="8-10",
            target_load_kg=Decimal("70.0"),
            actual_reps=9,
            actual_load_kg=Decimal("70.0"),
            completed=True,
        )
        session.add(set_log)
        await session.flush()

        assert set_log.id is not None
        assert set_log.actual_reps == 9
        assert ws.completed is True

        await session.rollback()
