"""Idempotent System Workout & Exercise Template Seeder for All Three ASCEND Pathways."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import PathwayType, WorkoutIntensity
from app.models.workout import ExerciseItem, WorkoutPlan


@dataclass
class WorkoutSeedSummary:
    plans_created: int = 0
    plans_existing: int = 0
    exercises_created: int = 0
    dry_run: bool = False


SYSTEM_WORKOUT_TEMPLATES: List[dict] = [
    {
        "title": "Full-Body Strength & Core Balance",
        "day_label": "General Fitness Session",
        "focus_area": "Functional Strength, Posture & Core Mobility",
        "estimated_minutes": 40,
        "intensity_label": WorkoutIntensity.MODERATE.value,
        "target_calories_burned": 310,
        "recommended_pathway": PathwayType.GENERAL_NUTRITION.value,
        "exercises": [
            {
                "name": "Goblet Squat (Dumbbell or Kettlebell)",
                "muscle_group": "Legs & Core",
                "default_sets": 3,
                "default_reps": "10–12 reps",
                "default_load_kg": Decimal("20.0"),
                "rest_seconds": 75,
                "notes": "Keep chest tall and elbows inside knees at the bottom.",
            },
            {
                "name": "Incline Dumbbell Press",
                "muscle_group": "Chest & Shoulders",
                "default_sets": 3,
                "default_reps": "10 reps",
                "default_load_kg": Decimal("18.0"),
                "rest_seconds": 75,
                "notes": "Smooth control down and full press overhead.",
            },
            {
                "name": "Single-Arm Dumbbell Row",
                "muscle_group": "Upper Back & Lats",
                "default_sets": 3,
                "default_reps": "12 reps / side",
                "default_load_kg": Decimal("20.0"),
                "rest_seconds": 60,
                "notes": "Draw elbow toward hip while keeping torso level.",
            },
            {
                "name": "Front Plank & Deadbug Superset",
                "muscle_group": "Core Stability",
                "default_sets": 3,
                "default_reps": "45 sec hold",
                "default_load_kg": Decimal("0.0"),
                "rest_seconds": 45,
                "notes": "Maintain gentle ribcage-to-pelvis brace.",
            },
        ],
    },
    {
        "title": "Upper Body Power & Conditioning",
        "day_label": "Athlete Performance Session",
        "focus_area": "Explosive Upper Body, Lats & Trunk Stability",
        "estimated_minutes": 55,
        "intensity_label": WorkoutIntensity.HIGH.value,
        "target_calories_burned": 440,
        "recommended_pathway": PathwayType.ATHLETE_PERFORMANCE.value,
        "exercises": [
            {
                "name": "Barbell Incline Bench Press",
                "muscle_group": "Upper Pectorals",
                "default_sets": 4,
                "default_reps": "6–8 reps",
                "default_load_kg": Decimal("82.5"),
                "rest_seconds": 120,
                "notes": "Controlled 3-second lowering phase; brief pause at chest.",
            },
            {
                "name": "Weighted Pull-Ups (Neutral Grip)",
                "muscle_group": "Latissimus Dorsi",
                "default_sets": 4,
                "default_reps": "8 reps",
                "default_load_kg": Decimal("15.0"),
                "rest_seconds": 120,
                "notes": "Full hang to chin over bar.",
            },
            {
                "name": "Seated Dumbbell Overhead Press",
                "muscle_group": "Shoulders",
                "default_sets": 3,
                "default_reps": "10 reps",
                "default_load_kg": Decimal("28.0"),
                "rest_seconds": 90,
                "notes": "Keep back supported against bench pad.",
            },
            {
                "name": "Chest-Supported T-Bar Row",
                "muscle_group": "Mid-Back & Rhomboids",
                "default_sets": 3,
                "default_reps": "10–12 reps",
                "default_load_kg": Decimal("60.0"),
                "rest_seconds": 90,
                "notes": "Pause briefly at top contraction.",
            },
        ],
    },
    {
        "title": "Progressive Hypertrophy — Compound Mass",
        "day_label": "Muscle Gain Session",
        "focus_area": "Lower & Upper Compound Hypertrophy",
        "estimated_minutes": 60,
        "intensity_label": WorkoutIntensity.HIGH.value,
        "target_calories_burned": 460,
        "recommended_pathway": PathwayType.MUSCLE_GAIN.value,
        "exercises": [
            {
                "name": "Barbell Back Squat",
                "muscle_group": "Quads, Glutes & Core",
                "default_sets": 4,
                "default_reps": "6–8 reps",
                "default_load_kg": Decimal("90.0"),
                "rest_seconds": 150,
                "notes": "Brace core before descent; drive evenly through mid-foot.",
            },
            {
                "name": "Romanian Deadlift (Barbell)",
                "muscle_group": "Hamstrings & Posterior Chain",
                "default_sets": 3,
                "default_reps": "8–10 reps",
                "default_load_kg": Decimal("80.0"),
                "rest_seconds": 120,
                "notes": "Hinge hips back with neutral spine until deep hamstring stretch.",
            },
            {
                "name": "Flat Dumbbell Bench Press",
                "muscle_group": "Pectorals & Triceps",
                "default_sets": 4,
                "default_reps": "8–10 reps",
                "default_load_kg": Decimal("32.5"),
                "rest_seconds": 90,
                "notes": "Control eccentric and press cleanly without shoulder flare.",
            },
            {
                "name": "Lat Pulldown (Wide Pronated Grip)",
                "muscle_group": "Lats & Upper Back",
                "default_sets": 3,
                "default_reps": "10–12 reps",
                "default_load_kg": Decimal("55.0"),
                "rest_seconds": 75,
                "notes": "Pull elbows down toward ribs with controlled return.",
            },
        ],
    },
]


async def seed_system_workout_templates(
    db: AsyncSession,
    *,
    dry_run: bool = False,
) -> WorkoutSeedSummary:
    """Idempotently seeds protected system workout templates for all three pathways.

    - Matches existing system templates by (title, recommended_pathway, is_system_template=True).
    - Never touches user-created workout plans or user-owned ad-hoc exercises.
    """
    summary = WorkoutSeedSummary(dry_run=dry_run)

    for tpl in SYSTEM_WORKOUT_TEMPLATES:
        stmt = (
            select(WorkoutPlan)
            .options(selectinload(WorkoutPlan.exercises))
            .where(
                WorkoutPlan.is_system_template == True,  # noqa: E712
                WorkoutPlan.created_by_user_id.is_(None),
                WorkoutPlan.title == tpl["title"],
                WorkoutPlan.recommended_pathway == tpl["recommended_pathway"],
            )
        )
        existing = await db.scalar(stmt)
        if existing is not None:
            summary.plans_existing += 1
            continue

        if dry_run:
            summary.plans_created += 1
            summary.exercises_created += len(tpl["exercises"])
            continue

        plan = WorkoutPlan(
            title=tpl["title"],
            day_label=tpl["day_label"],
            focus_area=tpl["focus_area"],
            estimated_minutes=tpl["estimated_minutes"],
            intensity_label=tpl["intensity_label"],
            target_calories_burned=tpl["target_calories_burned"],
            recommended_pathway=tpl["recommended_pathway"],
            is_system_template=True,
            created_by_user_id=None,
        )
        db.add(plan)
        await db.flush()

        for idx, ex in enumerate(tpl["exercises"], start=1):
            db.add(
                ExerciseItem(
                    workout_plan_id=plan.id,
                    name=ex["name"],
                    muscle_group=ex["muscle_group"],
                    default_sets=ex["default_sets"],
                    default_reps=ex["default_reps"],
                    default_load_kg=ex["default_load_kg"],
                    rest_seconds=ex["rest_seconds"],
                    notes=ex["notes"],
                    sort_order=idx,
                    created_by_user_id=None,
                )
            )
            summary.exercises_created += 1

        summary.plans_created += 1

    if not dry_run:
        await db.commit()

    return summary
