"""Comprehensive Test Suite for Workout Plans, Exercise Catalogue, Sessions, and Set Logs."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import pytest
from httpx import AsyncClient

from app.core.database import async_session_factory
from app.models.enums import ActivityLevel, BiologicalSex, GoalType, PathwayType, UnitSystem
from app.models.workout import ExerciseItem, WorkoutPlan, WorkoutSession


async def create_test_user_and_token(async_client: AsyncClient, prefix: str) -> dict:
    """Helper creating a test user and returning registration auth payload."""
    suffix = uuid.uuid4().hex[:8]
    email = f"{prefix}_{suffix}@ascend.io"
    password = "StrongPassword123!"

    reg_payload = {
        "email": email,
        "password": password,
        "fullName": f"Athlete {prefix}",
        "pathway": PathwayType.ATHLETE_PERFORMANCE.value,
        "archetype": "Athlete Performance",
        "goalType": GoalType.ATHLETIC_PERFORMANCE.value,
        "biologicalSex": BiologicalSex.MALE.value,
        "currentWeightKg": 82.0,
        "targetWeightKg": 85.0,
        "heightCm": 185.0,
        "age": 25,
        "activityLevel": ActivityLevel.VERY_ACTIVE.value,
        "unitSystem": UnitSystem.METRIC.value,
        "trainingDaysPerWeek": 5,
    }
    res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    return res.json()


@pytest.mark.asyncio
async def test_workout_plan_listing_and_filtering(async_client: AsyncClient):
    """Verifies workout plan listing and exercise ordering."""
    # Seed a test template plan
    async with async_session_factory() as session:
        plan = WorkoutPlan(
            title=f"Strength Power {uuid.uuid4().hex[:6]}",
            day_label="Day 1",
            focus_area="Upper Body Power",
            estimated_minutes=50,
            intensity_label="High",
            target_calories_burned=350,
            recommended_pathway=PathwayType.ATHLETE_PERFORMANCE.value,
            is_system_template=True,
        )
        session.add(plan)
        await session.flush()

        ex1 = ExerciseItem(
            workout_plan_id=plan.id,
            name="Incline Barbell Bench Press",
            muscle_group="Chest",
            default_sets=4,
            default_reps="8-10",
            default_load_kg=Decimal("70.0"),
            rest_seconds=90,
            sort_order=1,
        )
        ex2 = ExerciseItem(
            workout_plan_id=plan.id,
            name="Weighted Pull-Ups",
            muscle_group="Back",
            default_sets=3,
            default_reps="6-8",
            default_load_kg=Decimal("15.0"),
            rest_seconds=90,
            sort_order=2,
        )
        session.add_all([ex1, ex2])
        await session.commit()
        plan_id = str(plan.id)

    # 1. List plans without filter
    res = await async_client.get("/api/v1/workouts/plans")
    assert res.status_code == 200
    plans = res.json()
    assert len(plans) >= 1

    # 2. Get plan detail with exercises
    detail_res = await async_client.get(f"/api/v1/workouts/plans/{plan_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == plan_id
    assert len(detail["exercises"]) == 2
    assert detail["exercises"][0]["sortOrder"] == 1
    assert detail["exercises"][0]["name"] == "Incline Barbell Bench Press"


@pytest.mark.asyncio
async def test_custom_workout_plan_crud_and_system_protection(async_client: AsyncClient):
    """Verifies custom workout plan creation, system template deletion guard, and author deletion."""
    user = await create_test_user_and_token(async_client, "plan_creator")
    headers = {"Authorization": f"Bearer {user['tokens']['accessToken']}"}

    # 1. Create custom plan (system-template privilege escalation ignored)
    payload = {
        "title": f"Custom Hypertrophy {uuid.uuid4().hex[:6]}",
        "dayLabel": "Leg Day",
        "focusArea": "Quadriceps & Hamstrings",
        "estimatedMinutes": 60,
        "intensityLabel": "High",
        "targetCaloriesBurned": 400,
        "isSystemTemplate": True,  # Should be ignored by schema/service
        "exercises": [
            {
                "name": "Barbell Back Squat",
                "muscleGroup": "Legs",
                "defaultSets": 4,
                "defaultReps": "6-8",
                "defaultLoadKg": 100.0,
                "restSeconds": 120,
                "sortOrder": 1,
            }
        ],
    }
    create_res = await async_client.post("/api/v1/workouts/plans", json=payload, headers=headers)
    assert create_res.status_code == 201
    created_plan = create_res.json()
    assert created_plan["isSystemTemplate"] is False
    plan_id = created_plan["id"]
    assert len(created_plan["exercises"]) == 1

    # 1b. Cross-user isolation: User B cannot view or delete User A's custom plan
    other_user = await create_test_user_and_token(async_client, "plan_attacker")
    other_headers = {"Authorization": f"Bearer {other_user['tokens']['accessToken']}"}

    other_list_res = await async_client.get("/api/v1/workouts/plans", headers=other_headers)
    assert other_list_res.status_code == 200
    assert not any(p["id"] == plan_id for p in other_list_res.json())

    other_get_res = await async_client.get(f"/api/v1/workouts/plans/{plan_id}", headers=other_headers)
    assert other_get_res.status_code == 403

    other_del_res = await async_client.delete(f"/api/v1/workouts/plans/{plan_id}", headers=other_headers)
    assert other_del_res.status_code == 403

    # 2. Delete custom plan by owner
    del_res = await async_client.delete(f"/api/v1/workouts/plans/{plan_id}", headers=headers)
    assert del_res.status_code == 204

    # 3. Create system template directly in DB and verify deletion is protected
    async with async_session_factory() as session:
        sys_plan = WorkoutPlan(
            title=f"Protected System Template {uuid.uuid4().hex[:6]}",
            day_label="Full Body",
            focus_area="Core",
            estimated_minutes=30,
            intensity_label="Low",
            target_calories_burned=180,
            is_system_template=True,
        )
        session.add(sys_plan)
        await session.commit()
        sys_plan_id = str(sys_plan.id)

    prot_res = await async_client.delete(f"/api/v1/workouts/plans/{sys_plan_id}", headers=headers)
    assert prot_res.status_code == 403
    assert prot_res.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_workout_session_execution_and_set_logs(async_client: AsyncClient):
    """Verifies workout session creation, set-by-set telemetry logging, updates, and summaries."""
    user = await create_test_user_and_token(async_client, "session_user")
    headers = {"Authorization": f"Bearer {user['tokens']['accessToken']}"}
    today_str = date.today().isoformat()

    # 1. Log a workout session
    session_payload = {
        "sessionTitle": "Upper Body Hypertrophy",
        "dateLogged": today_str,
        "durationMinutes": 55,
        "caloriesBurned": 360,
        "rpe": 8,
        "notes": "Good mind-muscle connection.",
        "completed": True,
    }
    res = await async_client.post("/api/v1/workouts/sessions", json=session_payload, headers=headers)
    assert res.status_code == 201
    session_data = res.json()
    session_id = session_data["id"]
    assert session_data["durationMinutes"] == 55
    assert session_data["completed"] is True

    # 2. Batch log exercise sets (set-by-set telemetry)
    set_logs_payload = {
        "setLogs": [
            {
                "exerciseName": "Incline Dumbbell Press",
                "setNumber": 1,
                "targetReps": "10-12",
                "targetLoadKg": 30.0,
                "actualReps": 12,
                "actualLoadKg": 30.0,
                "completed": True,
            },
            {
                "exerciseName": "Incline Dumbbell Press",
                "setNumber": 2,
                "targetReps": "10-12",
                "targetLoadKg": 32.5,
                "actualReps": 10,
                "actualLoadKg": 32.5,
                "completed": True,
            },
        ]
    }
    sets_res = await async_client.put(f"/api/v1/workouts/sessions/{session_id}/sets", json=set_logs_payload, headers=headers)
    assert sets_res.status_code == 200
    saved_sets = sets_res.json()
    assert len(saved_sets) == 2
    assert saved_sets[0]["actualLoadKg"] == 30.0
    assert saved_sets[1]["actualLoadKg"] == 32.5

    # 3. Retrieve session with set logs
    detail_res = await async_client.get(f"/api/v1/workouts/sessions/{session_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["setLogs"]) == 2

    # 4. Update session metadata
    update_res = await async_client.put(
        f"/api/v1/workouts/sessions/{session_id}",
        json={"caloriesBurned": 400, "durationMinutes": 60},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["caloriesBurned"] == 400

    # 5. List sessions
    list_res = await async_client.get("/api/v1/workouts/sessions?days=7", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


@pytest.mark.asyncio
async def test_workout_session_cross_user_isolation(async_client: AsyncClient):
    """Verifies that User B cannot access, modify set logs, or delete User A's workout sessions."""
    user_a = await create_test_user_and_token(async_client, "athlete_a")
    user_b = await create_test_user_and_token(async_client, "athlete_b")

    headers_a = {"Authorization": f"Bearer {user_a['tokens']['accessToken']}"}
    headers_b = {"Authorization": f"Bearer {user_b['tokens']['accessToken']}"}

    # User A creates a session
    res = await async_client.post(
        "/api/v1/workouts/sessions",
        json={
            "sessionTitle": "User A Private Session",
            "dateLogged": date.today().isoformat(),
            "durationMinutes": 45,
            "caloriesBurned": 300,
        },
        headers=headers_a,
    )
    session_id = res.json()["id"]

    # User B attempts GET -> 403
    get_b = await async_client.get(f"/api/v1/workouts/sessions/{session_id}", headers=headers_b)
    assert get_b.status_code == 403
    assert get_b.json()["error"]["code"] == "FORBIDDEN"

    # User B attempts PUT sets -> 403
    put_b = await async_client.put(
        f"/api/v1/workouts/sessions/{session_id}/sets",
        json={"setLogs": [{"exerciseName": "Fraud Press", "setNumber": 1, "targetReps": "10", "targetLoadKg": 50.0}]},
        headers=headers_b,
    )
    assert put_b.status_code == 403

    # User B attempts DELETE -> 403
    del_b = await async_client.delete(f"/api/v1/workouts/sessions/{session_id}", headers=headers_b)
    assert del_b.status_code == 403

    # User A deletes their session -> 204
    del_a = await async_client.delete(f"/api/v1/workouts/sessions/{session_id}", headers=headers_a)
    assert del_a.status_code == 204


@pytest.mark.asyncio
async def test_adhoc_exercise_persistence_and_cross_user_isolation(async_client: AsyncClient):
    """Verifies user-owned ad-hoc exercise CRUD, system template protection, and cross-user isolation."""
    user_a = await create_test_user_and_token(async_client, "ex_user_a")
    user_b = await create_test_user_and_token(async_client, "ex_user_b")
    headers_a = {"Authorization": f"Bearer {user_a['tokens']['accessToken']}"}
    headers_b = {"Authorization": f"Bearer {user_b['tokens']['accessToken']}"}

    # Fetch a seeded system workout plan
    plans_res = await async_client.get("/api/v1/workouts/plans", headers=headers_a)
    assert plans_res.status_code == 200
    plans = plans_res.json()
    assert len(plans) >= 1
    system_plan_id = plans[0]["id"]

    # Check system exercise template protection
    plan_detail = await async_client.get(f"/api/v1/workouts/plans/{system_plan_id}", headers=headers_a)
    assert plan_detail.status_code == 200
    system_exercises = plan_detail.json()["exercises"]
    if system_exercises:
        sys_ex_id = system_exercises[0]["id"]
        sys_upd = await async_client.put(
            f"/api/v1/workouts/exercises/{sys_ex_id}",
            json={"name": "Tampered"},
            headers=headers_a,
        )
        assert sys_upd.status_code == 403
        sys_del = await async_client.delete(
            f"/api/v1/workouts/exercises/{sys_ex_id}",
            headers=headers_a,
        )
        assert sys_del.status_code == 403

    # User A adds an ad-hoc exercise to the plan
    unique_ex = f"Bulgarian Split Squat {uuid.uuid4().hex[:6]}"
    add_res = await async_client.post(
        f"/api/v1/workouts/plans/{system_plan_id}/exercises",
        json={
            "name": unique_ex,
            "muscleGroup": "Legs",
            "defaultSets": 4,
            "defaultReps": "10",
            "defaultLoadKg": 20.0,
            "restSeconds": 90,
        },
        headers=headers_a,
    )
    assert add_res.status_code == 201
    created_ex = add_res.json()
    ex_id = created_ex["id"]
    assert created_ex["createdByUserId"] is not None

    # User A sees it in plan detail and exercise catalog
    plan_a = await async_client.get(f"/api/v1/workouts/plans/{system_plan_id}", headers=headers_a)
    assert any(e["id"] == ex_id for e in plan_a.json()["exercises"])
    list_a = await async_client.get("/api/v1/workouts/exercises", headers=headers_a)
    assert any(e["id"] == ex_id for e in list_a.json())

    # User B does NOT see User A's ad-hoc exercise and cannot access/modify/delete it
    plan_b = await async_client.get(f"/api/v1/workouts/plans/{system_plan_id}", headers=headers_b)
    assert not any(e["id"] == ex_id for e in plan_b.json()["exercises"])
    list_b = await async_client.get("/api/v1/workouts/exercises", headers=headers_b)
    assert not any(e["id"] == ex_id for e in list_b.json())

    get_b = await async_client.get(f"/api/v1/workouts/exercises/{ex_id}", headers=headers_b)
    assert get_b.status_code == 403
    upd_b = await async_client.put(
        f"/api/v1/workouts/exercises/{ex_id}",
        json={"defaultLoadKg": 99.0},
        headers=headers_b,
    )
    assert upd_b.status_code == 403
    del_b = await async_client.delete(f"/api/v1/workouts/exercises/{ex_id}", headers=headers_b)
    assert del_b.status_code == 403

    # User A updates and deletes their ad-hoc exercise
    upd_a = await async_client.put(
        f"/api/v1/workouts/exercises/{ex_id}",
        json={"defaultLoadKg": 24.0},
        headers=headers_a,
    )
    assert upd_a.status_code == 200
    assert upd_a.json()["defaultLoadKg"] == 24.0

    del_a = await async_client.delete(f"/api/v1/workouts/exercises/{ex_id}", headers=headers_a)
    assert del_a.status_code == 204
