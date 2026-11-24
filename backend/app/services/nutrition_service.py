"""Nutrition Domain Business Logic: Food Catalog, Pure 3NF Bridge & Intake Snapshots."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AccessForbiddenException, EntityNotFoundException, ValidationException
from app.models.enums import NutrientCategory
from app.models.nutrition import FoodItem, FoodNutrient, IntakeRecord, Nutrient
from app.models.user import NutritionGoal, User
from app.schemas.nutrition import (
    ComputedNutrientsResponse,
    CoreNutrientsSchema,
    CreateCustomFoodRequest,
    CreateIntakeRequest,
    DailyAdherenceItem,
    DailyIntakeResponse,
    DailyTotalsResponse,
    FoodDetailResponse,
    FoodItemResponse,
    FoodSearchResponse,
    IntakeRecordResponse,
    IntakeReportResponse,
    NutrientDetailSchema,
    UpdateIntakeRequest,
)

CANONICAL_NUTRIENTS = [
    {"code": "ENERC_KCAL", "name": "Energy (Calories)", "unit": "kcal", "category": NutrientCategory.MACRONUTRIENT, "display_order": 1},
    {"code": "PROCNT", "name": "Protein", "unit": "g", "category": NutrientCategory.MACRONUTRIENT, "display_order": 2},
    {"code": "CHOCDF", "name": "Carbohydrate", "unit": "g", "category": NutrientCategory.MACRONUTRIENT, "display_order": 3},
    {"code": "FAT", "name": "Total Fat", "unit": "g", "category": NutrientCategory.MACRONUTRIENT, "display_order": 4},
    {"code": "FIBTG", "name": "Dietary Fiber", "unit": "g", "category": NutrientCategory.MACRONUTRIENT, "display_order": 5},
    {"code": "SUGAR", "name": "Total Sugars", "unit": "g", "category": NutrientCategory.MACRONUTRIENT, "display_order": 6},
    {"code": "NA", "name": "Sodium", "unit": "mg", "category": NutrientCategory.MINERAL, "display_order": 7},
    {"code": "K", "name": "Potassium", "unit": "mg", "category": NutrientCategory.MINERAL, "display_order": 8},
    {"code": "CA", "name": "Calcium", "unit": "mg", "category": NutrientCategory.MINERAL, "display_order": 9},
    {"code": "FE", "name": "Iron", "unit": "mg", "category": NutrientCategory.MINERAL, "display_order": 10},
]


async def ensure_canonical_nutrients(db: AsyncSession) -> Dict[str, Nutrient]:
    """Ensures base canonical nutrients exist in database and returns mapping by code."""
    stmt = select(Nutrient)
    existing_nutrients = (await db.scalars(stmt)).all()
    nutrient_map = {n.code: n for n in existing_nutrients}

    for defn in CANONICAL_NUTRIENTS:
        if defn["code"] not in nutrient_map:
            new_n = Nutrient(
                code=defn["code"],
                name=defn["name"],
                unit=defn["unit"],
                category=defn["category"],
                display_order=defn["display_order"],
            )
            db.add(new_n)
            await db.flush()
            nutrient_map[defn["code"]] = new_n

    return nutrient_map


def extract_core_nutrients(food: FoodItem) -> CoreNutrientsSchema:
    """Extracts standard macronutrient and micronutrient schema from food_nutrients bridge."""
    code_map: Dict[str, float] = {}
    if food.nutrients:
        for fn in food.nutrients:
            if fn.nutrient:
                code_map[fn.nutrient.code] = float(fn.amount_per_reference_qty)

    return CoreNutrientsSchema(
        calories=code_map.get("ENERC_KCAL", 0.0),
        proteinG=code_map.get("PROCNT", 0.0),
        carbsG=code_map.get("CHOCDF", 0.0),
        fatG=code_map.get("FAT", 0.0),
        fiberG=code_map.get("FIBTG"),
        sugarG=code_map.get("SUGAR"),
        sodiumMg=code_map.get("NA"),
        potassiumMg=code_map.get("K"),
        calciumMg=code_map.get("CA"),
        ironMg=code_map.get("FE"),
    )


def map_food_item_response(food: FoodItem) -> FoodItemResponse:
    """Converts FoodItem ORM model to FoodItemResponse schema."""
    return FoodItemResponse(
        id=food.id,
        code=food.code,
        name=food.name,
        alternateNames=food.alternate_names or [],
        brandOrSource=food.brand_or_source,
        category=food.category,
        cuisineRegion=food.cuisine_region,
        preparationState=food.preparation_state,
        referenceQuantity=float(food.reference_quantity),
        referenceUnit=food.reference_unit,
        referenceLabel=food.reference_label,
        gramsPerServing=float(food.grams_per_serving),
        ediblePortionPct=float(food.edible_portion_pct),
        isMicronutrientComplete=food.is_micronutrient_complete,
        isCustomUserFood=food.is_custom_user_food,
        createdByUserId=food.created_by_user_id,
        dataNote=food.data_note,
        nutrients=extract_core_nutrients(food),
        createdAt=food.created_at,
    )


class FoodService:
    """Food catalog searching, custom food creation, and nutrient querying."""

    @staticmethod
    async def search_foods(
        db: AsyncSession,
        current_user: Optional[User] = None,
        q: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> FoodSearchResponse:
        # Base query with eager loading of nutrients bridge
        base_query = select(FoodItem).options(
            selectinload(FoodItem.nutrients).selectinload(FoodNutrient.nutrient)
        )
        count_query = select(func.count(FoodItem.id))

        # Multi-tenant isolation:
        # Accessible if public (is_custom_user_food == False) OR created by current user
        if current_user:
            tenant_filter = or_(
                FoodItem.is_custom_user_food == False,  # noqa: E712
                FoodItem.created_by_user_id == current_user.id,
            )
        else:
            tenant_filter = FoodItem.is_custom_user_food == False  # noqa: E712

        base_query = base_query.where(tenant_filter)
        count_query = count_query.where(tenant_filter)

        # Category filter
        if category and category.strip().lower() != "all":
            cat_filter = func.lower(FoodItem.category) == category.strip().lower()
            base_query = base_query.where(cat_filter)
            count_query = count_query.where(cat_filter)

        # Text search (matches name, alternate_names, or brand using GIN trigram indexes)
        if q and q.strip():
            term = f"%{q.strip()}%"
            search_filter = or_(
                FoodItem.name.ilike(term),
                FoodItem.brand_or_source.ilike(term),
                func.array_to_string(FoodItem.alternate_names, " ").ilike(term),
            )
            base_query = base_query.where(search_filter)
            count_query = count_query.where(search_filter)

        total = await db.scalar(count_query) or 0
        items = (await db.scalars(base_query.order_by(FoodItem.name.asc()).limit(limit).offset(offset))).all()

        return FoodSearchResponse(
            items=[map_food_item_response(f) for f in items],
            total=total,
            limit=limit,
            offset=offset,
        )

    @staticmethod
    async def get_food_by_id(
        db: AsyncSession,
        food_id: uuid.UUID,
        current_user: Optional[User] = None,
    ) -> FoodDetailResponse:
        stmt = (
            select(FoodItem)
            .options(selectinload(FoodItem.nutrients).selectinload(FoodNutrient.nutrient))
            .where(FoodItem.id == food_id)
        )
        food = await db.scalar(stmt)
        if not food:
            raise EntityNotFoundException(f"Food item with ID '{food_id}' not found.")

        # Multi-tenant security check
        if food.is_custom_user_food:
            if not current_user or food.created_by_user_id != current_user.id:
                raise AccessForbiddenException("You do not have access to this custom food item.")

        base_resp = map_food_item_response(food)

        all_nutrients: List[NutrientDetailSchema] = []
        if food.nutrients:
            for fn in food.nutrients:
                if fn.nutrient:
                    all_nutrients.append(
                        NutrientDetailSchema(
                            code=fn.nutrient.code,
                            name=fn.nutrient.name,
                            unit=fn.nutrient.unit,
                            category=fn.nutrient.category,
                            amount=float(fn.amount_per_reference_qty),
                        )
                    )

        return FoodDetailResponse(
            **base_resp.model_dump(),
            allNutrients=all_nutrients,
        )

    @staticmethod
    async def create_custom_food(
        db: AsyncSession,
        current_user: User,
        payload: CreateCustomFoodRequest,
    ) -> FoodItemResponse:
        nutrient_map = await ensure_canonical_nutrients(db)

        food = FoodItem(
            name=payload.name.strip(),
            alternate_names=payload.alternateNames,
            brand_or_source=payload.brandOrSource.strip(),
            category=payload.category.strip(),
            cuisine_region=payload.cuisineRegion,
            preparation_state=payload.preparationState,
            reference_quantity=Decimal(str(payload.referenceQuantity)),
            reference_unit=payload.referenceUnit,
            reference_label=payload.referenceLabel,
            grams_per_serving=Decimal(str(payload.gramsPerServing)),
            edible_portion_pct=Decimal(str(payload.ediblePortionPct)),
            is_micronutrient_complete=False,
            is_custom_user_food=True,
            created_by_user_id=current_user.id,
            data_note=payload.dataNote,
        )
        db.add(food)
        await db.flush()

        # Wire nutrients into FoodNutrient bridge
        nutrients_to_add: List[Tuple[str, Optional[float]]] = [
            ("ENERC_KCAL", payload.nutrients.calories),
            ("PROCNT", payload.nutrients.proteinG),
            ("CHOCDF", payload.nutrients.carbsG),
            ("FAT", payload.nutrients.fatG),
            ("FIBTG", payload.nutrients.fiberG),
            ("SUGAR", payload.nutrients.sugarG),
            ("NA", payload.nutrients.sodiumMg),
            ("K", payload.nutrients.potassiumMg),
            ("CA", payload.nutrients.calciumMg),
            ("FE", payload.nutrients.ironMg),
        ]

        for code, val in nutrients_to_add:
            if val is not None and code in nutrient_map:
                fn = FoodNutrient(
                    food_id=food.id,
                    nutrient_id=nutrient_map[code].id,
                    amount_per_reference_qty=Decimal(str(round(val, 3))),
                )
                db.add(fn)

        await db.commit()
        return await FoodService.get_food_by_id(db, food.id, current_user)

    @staticmethod
    async def delete_custom_food(
        db: AsyncSession,
        food_id: uuid.UUID,
        current_user: User,
    ) -> None:
        food = await db.get(FoodItem, food_id)
        if not food:
            raise EntityNotFoundException(f"Food item with ID '{food_id}' not found.")

        if not food.is_custom_user_food:
            raise AccessForbiddenException("System reference foods cannot be deleted.")

        if food.created_by_user_id != current_user.id:
            raise AccessForbiddenException("You do not have permission to delete this custom food.")

        await db.delete(food)
        await db.commit()


class IntakeService:
    """Nutrient snapshot calculation, intake logging, updates, and rolling adherence reports."""

    @staticmethod
    def calculate_scaled_nutrients(
        food: FoodItem,
        quantity: float,
        unit: str,
    ) -> ComputedNutrientsResponse:
        """Deterministically scales nutrients according to consumed portion unit and quantity."""
        qty_dec = Decimal(str(quantity))
        ref_unit = (food.reference_unit or "g").lower()
        ref_label = (food.reference_label or "").lower()

        if food.reference_quantity <= 0:
            raise ValidationException("Food item has invalid reference quantity.")

        # Direct match with food's reference unit requires no mass conversion assumption
        if unit == ref_unit:
            ratio = float(qty_dec / food.reference_quantity)
        else:
            # Resolve reference quantity into grams/ml
            if ref_unit == "serving":
                if food.grams_per_serving <= 0:
                    raise ValidationException("Serving-referenced food lacks valid gramsPerServing.")
                base_grams = food.reference_quantity * food.grams_per_serving
            elif ref_unit == "oz":
                base_grams = food.reference_quantity * Decimal("28.3495")
            elif ref_unit == "cup":
                if "cup" in ref_label and food.grams_per_serving > 0:
                    base_grams = food.reference_quantity * food.grams_per_serving
                else:
                    base_grams = food.reference_quantity * Decimal("240.0")
            else:  # 'g', 'ml'
                base_grams = food.reference_quantity

            # Resolve consumed portion into grams/ml
            if unit in ("g", "ml"):
                total_grams = qty_dec
            elif unit == "serving":
                if food.grams_per_serving <= 0:
                    raise ValidationException("Food item does not define gramsPerServing.")
                total_grams = qty_dec * food.grams_per_serving
            elif unit == "oz":
                total_grams = qty_dec * Decimal("28.3495")
            elif unit == "cup":
                # Use food-specific cup mass when reference_label specifies cup, or 240ml for liquids
                if "cup" in ref_label and food.grams_per_serving > 0:
                    total_grams = qty_dec * food.grams_per_serving
                elif ref_unit == "ml" or (food.category or "") in (
                    "Beverages",
                    "Beverages & Hydration",
                    "Dairy",
                    "Dairy & Alternatives",
                    "Soups",
                ):
                    total_grams = qty_dec * Decimal("240.0")
                else:
                    raise ValidationException(
                        "Cup conversion requires food-specific cup weight or liquid volume; log in g, oz, or serving."
                    )
            else:
                raise ValidationException(f"Unsupported serving unit: '{unit}'.")

            ratio = float(total_grams / base_grams)

        # Extract base reference values
        base_nutrients = extract_core_nutrients(food)

        cals = int(round(base_nutrients.calories * ratio))
        prot = round(base_nutrients.proteinG * ratio, 1)
        carbs = round(base_nutrients.carbsG * ratio, 1)
        fat = round(base_nutrients.fatG * ratio, 1)
        fiber = round(base_nutrients.fiberG * ratio, 1) if base_nutrients.fiberG is not None else None
        sodium = round(base_nutrients.sodiumMg * ratio, 1) if base_nutrients.sodiumMg is not None else None

        return ComputedNutrientsResponse(
            calories=cals,
            proteinG=prot,
            carbsG=carbs,
            fatG=fat,
            fiberG=fiber,
            sodiumMg=sodium,
        )

    @staticmethod
    async def log_intake(
        db: AsyncSession,
        current_user: User,
        payload: CreateIntakeRequest,
    ) -> IntakeRecordResponse:
        food_stmt = (
            select(FoodItem)
            .options(selectinload(FoodItem.nutrients).selectinload(FoodNutrient.nutrient))
            .where(FoodItem.id == payload.foodId)
        )
        food = await db.scalar(food_stmt)
        if not food:
            raise EntityNotFoundException(f"Food item '{payload.foodId}' not found.")

        if food.is_custom_user_food and food.created_by_user_id != current_user.id:
            raise AccessForbiddenException("You do not have permission to log this custom food.")

        computed = IntakeService.calculate_scaled_nutrients(
            food=food,
            quantity=payload.quantity,
            unit=payload.unit,
        )

        time_val = payload.timeLogged or datetime.now(timezone.utc).strftime("%H:%M")
        date_obj = date.fromisoformat(payload.dateIso)

        record = IntakeRecord(
            user_id=current_user.id,
            food_id=food.id,
            food_name=food.name,
            category=food.category,
            meal=payload.meal,
            date_logged=date_obj,
            time_logged=time_val,
            quantity=Decimal(str(payload.quantity)),
            unit=payload.unit,
            computed_calories=computed.calories,
            computed_protein_g=Decimal(str(computed.proteinG)),
            computed_carbs_g=Decimal(str(computed.carbsG)),
            computed_fat_g=Decimal(str(computed.fatG)),
            computed_fiber_g=Decimal(str(computed.fiberG)) if computed.fiberG is not None else None,
            computed_sodium_mg=Decimal(str(computed.sodiumMg)) if computed.sodiumMg is not None else None,
            is_user_logged=True,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

        return IntakeRecordResponse(
            id=record.id,
            foodId=record.food_id,
            foodName=record.food_name,
            category=record.category,
            meal=record.meal,
            quantity=float(record.quantity),
            unit=record.unit,
            loggedAt=record.time_logged,
            dateIso=record.date_logged.isoformat(),
            computedNutrients=computed,
            isUserLogged=record.is_user_logged,
            createdAt=record.created_at,
        )

    @staticmethod
    async def get_daily_intake(
        db: AsyncSession,
        current_user: User,
        date_iso: str,
    ) -> DailyIntakeResponse:
        date_obj = date.fromisoformat(date_iso)

        stmt = (
            select(IntakeRecord)
            .where(
                IntakeRecord.user_id == current_user.id,
                IntakeRecord.date_logged == date_obj,
            )
            .order_by(IntakeRecord.time_logged.asc(), IntakeRecord.created_at.asc())
        )
        records = (await db.scalars(stmt)).all()

        total_cals = 0
        total_prot = 0.0
        total_carbs = 0.0
        total_fat = 0.0
        total_fiber = 0.0
        total_sodium = 0.0
        has_measured_fiber = False
        has_measured_sodium = False

        items: List[IntakeRecordResponse] = []
        for r in records:
            c = ComputedNutrientsResponse(
                calories=r.computed_calories,
                proteinG=float(r.computed_protein_g),
                carbsG=float(r.computed_carbs_g),
                fatG=float(r.computed_fat_g),
                fiberG=float(r.computed_fiber_g) if r.computed_fiber_g is not None else None,
                sodiumMg=float(r.computed_sodium_mg) if r.computed_sodium_mg is not None else None,
            )
            total_cals += r.computed_calories
            total_prot += float(r.computed_protein_g)
            total_carbs += float(r.computed_carbs_g)
            total_fat += float(r.computed_fat_g)
            if r.computed_fiber_g is not None:
                has_measured_fiber = True
                total_fiber += float(r.computed_fiber_g)
            if r.computed_sodium_mg is not None:
                has_measured_sodium = True
                total_sodium += float(r.computed_sodium_mg)

            items.append(
                IntakeRecordResponse(
                    id=r.id,
                    foodId=r.food_id,
                    foodName=r.food_name,
                    category=r.category,
                    meal=r.meal,
                    quantity=float(r.quantity),
                    unit=r.unit,
                    loggedAt=r.time_logged,
                    dateIso=r.date_logged.isoformat(),
                    computedNutrients=c,
                    isUserLogged=r.is_user_logged,
                    createdAt=r.created_at,
                )
            )

        # Fetch user goals for water target
        goal = await db.scalar(select(NutritionGoal).where(NutritionGoal.user_id == current_user.id))
        water_target = goal.water_ml if goal else 2500

        daily_totals = DailyTotalsResponse(
            calories=total_cals,
            proteinG=round(total_prot, 1),
            carbsG=round(total_carbs, 1),
            fatG=round(total_fat, 1),
            fiberG=round(total_fiber, 1) if has_measured_fiber else None,
            sodiumMg=round(total_sodium, 1) if has_measured_sodium else None,
            waterMl=water_target,
        )

        return DailyIntakeResponse(
            dateIso=date_iso,
            records=items,
            dailyTotals=daily_totals,
        )

    @staticmethod
    async def update_intake(
        db: AsyncSession,
        current_user: User,
        record_id: uuid.UUID,
        payload: UpdateIntakeRequest,
    ) -> IntakeRecordResponse:
        record = await db.get(IntakeRecord, record_id)
        if not record:
            raise EntityNotFoundException(f"Intake record '{record_id}' not found.")

        if record.user_id != current_user.id:
            raise AccessForbiddenException("You do not have permission to modify this intake record.")

        # If quantity or unit changed and food is available, recalculate snapshot
        recalc = False
        new_quantity = payload.quantity if payload.quantity is not None else float(record.quantity)
        new_unit = payload.unit if payload.unit is not None else record.unit

        if payload.quantity is not None and Decimal(str(payload.quantity)) != record.quantity:
            recalc = True
        if payload.unit is not None and payload.unit != record.unit:
            recalc = True

        if recalc and record.food_id:
            food_stmt = (
                select(FoodItem)
                .options(selectinload(FoodItem.nutrients).selectinload(FoodNutrient.nutrient))
                .where(FoodItem.id == record.food_id)
            )
            food = await db.scalar(food_stmt)
            if food:
                computed = IntakeService.calculate_scaled_nutrients(food, new_quantity, new_unit)
                record.computed_calories = computed.calories
                record.computed_protein_g = Decimal(str(computed.proteinG))
                record.computed_carbs_g = Decimal(str(computed.carbsG))
                record.computed_fat_g = Decimal(str(computed.fatG))
                record.computed_fiber_g = Decimal(str(computed.fiberG)) if computed.fiberG is not None else None
                record.computed_sodium_mg = Decimal(str(computed.sodiumMg)) if computed.sodiumMg is not None else None
        elif recalc and not record.food_id:
            if new_unit != record.unit:
                raise ValidationException(
                    "Cannot change serving unit after source food item was deleted; update quantity only."
                )
            if float(record.quantity) > 0:
                scale = new_quantity / float(record.quantity)
                record.computed_calories = int(round(record.computed_calories * scale))
                record.computed_protein_g = Decimal(str(round(float(record.computed_protein_g) * scale, 1)))
                record.computed_carbs_g = Decimal(str(round(float(record.computed_carbs_g) * scale, 1)))
                record.computed_fat_g = Decimal(str(round(float(record.computed_fat_g) * scale, 1)))
                if record.computed_fiber_g is not None:
                    record.computed_fiber_g = Decimal(str(round(float(record.computed_fiber_g) * scale, 1)))
                if record.computed_sodium_mg is not None:
                    record.computed_sodium_mg = Decimal(str(round(float(record.computed_sodium_mg) * scale, 1)))

        if payload.quantity is not None:
            record.quantity = Decimal(str(payload.quantity))
        if payload.unit is not None:
            record.unit = payload.unit
        if payload.meal is not None:
            record.meal = payload.meal
        if payload.dateIso is not None:
            record.date_logged = date.fromisoformat(payload.dateIso)
        if payload.timeLogged is not None:
            record.time_logged = payload.timeLogged

        await db.commit()
        await db.refresh(record)

        computed_resp = ComputedNutrientsResponse(
            calories=record.computed_calories,
            proteinG=float(record.computed_protein_g),
            carbsG=float(record.computed_carbs_g),
            fatG=float(record.computed_fat_g),
            fiberG=float(record.computed_fiber_g) if record.computed_fiber_g is not None else None,
            sodiumMg=float(record.computed_sodium_mg) if record.computed_sodium_mg is not None else None,
        )

        return IntakeRecordResponse(
            id=record.id,
            foodId=record.food_id,
            foodName=record.food_name,
            category=record.category,
            meal=record.meal,
            quantity=float(record.quantity),
            unit=record.unit,
            loggedAt=record.time_logged,
            dateIso=record.date_logged.isoformat(),
            computedNutrients=computed_resp,
            isUserLogged=record.is_user_logged,
            createdAt=record.created_at,
        )

    @staticmethod
    async def delete_intake(
        db: AsyncSession,
        current_user: User,
        record_id: uuid.UUID,
    ) -> None:
        record = await db.get(IntakeRecord, record_id)
        if not record:
            raise EntityNotFoundException(f"Intake record '{record_id}' not found.")

        if record.user_id != current_user.id:
            raise AccessForbiddenException("You do not have permission to delete this intake record.")

        await db.delete(record)
        await db.commit()

    @staticmethod
    async def get_reports(
        db: AsyncSession,
        current_user: User,
        days: int = 7,
    ) -> IntakeReportResponse:
        days = min(max(days, 1), 90)
        today = date.today()
        start_date = today - timedelta(days=days - 1)

        # Fetch user goals
        goal = await db.scalar(select(NutritionGoal).where(NutritionGoal.user_id == current_user.id))
        target_calories = goal.daily_calories if goal else 2000
        target_protein = float(goal.protein_g) if goal else 150.0
        target_carbs = float(goal.carbs_g) if goal else 200.0
        target_fat = float(goal.fat_g) if goal else 65.0

        stmt = (
            select(
                IntakeRecord.date_logged,
                func.sum(IntakeRecord.computed_calories).label("calories"),
                func.sum(IntakeRecord.computed_protein_g).label("protein"),
                func.sum(IntakeRecord.computed_carbs_g).label("carbs"),
                func.sum(IntakeRecord.computed_fat_g).label("fat"),
            )
            .where(
                IntakeRecord.user_id == current_user.id,
                IntakeRecord.date_logged >= start_date,
                IntakeRecord.date_logged <= today,
            )
            .group_by(IntakeRecord.date_logged)
        )
        results = (await db.execute(stmt)).all()
        day_map = {row.date_logged: row for row in results}

        report_items: List[DailyAdherenceItem] = []
        for i in range(days):
            current_d = start_date + timedelta(days=i)
            row = day_map.get(current_d)

            cals = int(row.calories) if row and row.calories else 0
            prot = round(float(row.protein), 1) if row and row.protein else 0.0
            carbs = round(float(row.carbs), 1) if row and row.carbs else 0.0
            fat = round(float(row.fat), 1) if row and row.fat else 0.0

            delta = cals - target_calories
            # Compliance defined as within +/- 10% of calorie target
            compliant = abs(delta) <= (target_calories * 0.10) if cals > 0 else False

            report_items.append(
                DailyAdherenceItem(
                    dateIso=current_d.isoformat(),
                    calories=cals,
                    proteinG=prot,
                    carbsG=carbs,
                    fatG=fat,
                    targetCalories=target_calories,
                    targetProteinG=target_protein,
                    targetCarbsG=target_carbs,
                    targetFatG=target_fat,
                    calorieDelta=delta,
                    compliant=compliant,
                )
            )

        return IntakeReportResponse(
            days=days,
            report=report_items,
        )
