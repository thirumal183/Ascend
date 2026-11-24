"""Comprehensive Test Suite for Biometric Telemetry, Progress Checkpoints, and Trend Summaries."""

from __future__ import annotations

import uuid
from datetime import date, timedelta
import pytest
from httpx import AsyncClient

from app.models.enums import ActivityLevel, BiologicalSex, GoalType, PathwayType, UnitSystem


async def create_test_user_and_token(async_client: AsyncClient, prefix: str) -> dict:
    """Helper creating a test user and returning registration auth payload."""
    suffix = uuid.uuid4().hex[:8]
    email = f"{prefix}_{suffix}@ascend.io"
    password = "StrongPassword123!"

    reg_payload = {
        "email": email,
        "password": password,
        "fullName": f"Tracker {prefix}",
        "pathway": PathwayType.GENERAL_NUTRITION.value,
        "archetype": "General Fitness & Lifestyle",
        "goalType": GoalType.WEIGHT_LOSS.value,
        "biologicalSex": BiologicalSex.FEMALE.value,
        "currentWeightKg": 70.0,
        "targetWeightKg": 65.0,
        "heightCm": 168.0,
        "age": 29,
        "activityLevel": ActivityLevel.MODERATELY_ACTIVE.value,
        "unitSystem": UnitSystem.METRIC.value,
        "trainingDaysPerWeek": 3,
    }
    res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    assert res.status_code == 201
    return res.json()


@pytest.mark.asyncio
async def test_progress_record_logging_and_upsert(async_client: AsyncClient):
    """Verifies biometric checkpoint logging and seamless upsert on duplicate date."""
    user = await create_test_user_and_token(async_client, "progress_user")
    headers = {"Authorization": f"Bearer {user['tokens']['accessToken']}"}
    today_str = date.today().isoformat()

    # 1. Log progress record
    payload = {
        "dateLogged": today_str,
        "label": "Morning Fasted Check",
        "weightKg": 69.8,
        "bodyFatPct": 22.5,
        "waistCm": 74.0,
        "chestCm": 90.0,
        "armCm": 28.5,
        "thighCm": 54.0,
        "caloriesConsumed": 1800,
        "proteinConsumedG": 120.0,
        "carbsConsumedG": 180.0,
        "fatConsumedG": 50.0,
        "workoutCompleted": True,
        "activityMinutes": 45,
        "stepsCount": 10500,
    }
    res = await async_client.post("/api/v1/progress/records", json=payload, headers=headers)
    assert res.status_code == 201
    record = res.json()
    record_id = record["id"]
    assert record["weightKg"] == 69.8
    assert record["bodyFatPct"] == 22.5
    assert record["workoutCompleted"] is True

    # 2. Upsert: Log again for same date with updated measurements
    payload["weightKg"] = 69.5
    payload["stepsCount"] = 12000
    upsert_res = await async_client.post("/api/v1/progress/records", json=payload, headers=headers)
    assert upsert_res.status_code == 201
    updated_record = upsert_res.json()
    assert updated_record["id"] == record_id  # Same record ID upserted!
    assert updated_record["weightKg"] == 69.5
    assert updated_record["stepsCount"] == 12000

    # 3. Retrieve single record by ID
    get_res = await async_client.get(f"/api/v1/progress/records/{record_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["weightKg"] == 69.5

    # 4. Update via PUT
    put_res = await async_client.put(
        f"/api/v1/progress/records/{record_id}",
        json={"weightKg": 69.3, "label": "Evening Re-weigh"},
        headers=headers,
    )
    assert put_res.status_code == 200
    assert put_res.json()["weightKg"] == 69.3
    assert put_res.json()["label"] == "Evening Re-weigh"

    # 5. List records
    list_res = await async_client.get("/api/v1/progress/records?days=7", headers=headers)
    assert list_res.status_code == 200
    records = list_res.json()
    assert len(records) >= 1

    # 6. Delete record
    del_res = await async_client.delete(f"/api/v1/progress/records/{record_id}", headers=headers)
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_progress_cross_user_isolation(async_client: AsyncClient):
    """Verifies that User B cannot access, update, or delete User A's progress records."""
    user_a = await create_test_user_and_token(async_client, "client_a")
    user_b = await create_test_user_and_token(async_client, "client_b")

    headers_a = {"Authorization": f"Bearer {user_a['tokens']['accessToken']}"}
    headers_b = {"Authorization": f"Bearer {user_b['tokens']['accessToken']}"}

    # User A creates progress record
    res = await async_client.post(
        "/api/v1/progress/records",
        json={
            "dateLogged": date.today().isoformat(),
            "label": "Confidential Biometrics",
            "weightKg": 75.0,
        },
        headers=headers_a,
    )
    record_id = res.json()["id"]

    # User B attempts GET -> 403
    get_b = await async_client.get(f"/api/v1/progress/records/{record_id}", headers=headers_b)
    assert get_b.status_code == 403
    assert get_b.json()["error"]["code"] == "FORBIDDEN"

    # User B attempts PUT -> 403
    put_b = await async_client.put(
        f"/api/v1/progress/records/{record_id}",
        json={"weightKg": 80.0},
        headers=headers_b,
    )
    assert put_b.status_code == 403

    # User B attempts DELETE -> 403
    del_b = await async_client.delete(f"/api/v1/progress/records/{record_id}", headers=headers_b)
    assert del_b.status_code == 403


@pytest.mark.asyncio
async def test_progress_summary_trends(async_client: AsyncClient):
    """Verifies statistical time-series summary calculations across multi-day checkpoints."""
    user = await create_test_user_and_token(async_client, "trend_user")
    headers = {"Authorization": f"Bearer {user['tokens']['accessToken']}"}

    today = date.today()
    day_3_ago = (today - timedelta(days=3)).isoformat()
    today_str = today.isoformat()

    # Log checkpoint 3 days ago (start: 80.0 kg, 20% BF)
    await async_client.post(
        "/api/v1/progress/records",
        json={
            "dateLogged": day_3_ago,
            "label": "Day -3",
            "weightKg": 80.0,
            "bodyFatPct": 20.0,
            "workoutCompleted": True,
            "stepsCount": 10000,
            "caloriesConsumed": 2200,
        },
        headers=headers,
    )

    # Log checkpoint today (current: 78.5 kg, 19.5% BF)
    await async_client.post(
        "/api/v1/progress/records",
        json={
            "dateLogged": today_str,
            "label": "Today",
            "weightKg": 78.5,
            "bodyFatPct": 19.5,
            "workoutCompleted": True,
            "stepsCount": 12000,
            "caloriesConsumed": 2000,
        },
        headers=headers,
    )

    # Fetch summary
    res = await async_client.get("/api/v1/progress/summary?days=7", headers=headers)
    assert res.status_code == 200
    summary = res.json()

    assert summary["recordsCount"] == 2
    assert summary["startWeightKg"] == 80.0
    assert summary["currentWeightKg"] == 78.5
    assert summary["weightDeltaKg"] == -1.5
    assert summary["startBodyFatPct"] == 20.0
    assert summary["currentBodyFatPct"] == 19.5
    assert summary["bodyFatDelta"] == -0.5
    assert summary["totalWorkoutsCompleted"] == 2
    assert summary["averageDailySteps"] == 11000
    assert summary["averageCaloriesConsumed"] == 2100


@pytest.mark.asyncio
async def test_progress_partial_same_date_upsert_preserves_existing_fields(async_client: AsyncClient):
    """AUD-P2-09: Partial weight-only same-date upsert must not wipe previously logged calories or steps."""
    user = await create_test_user_and_token(async_client, "partial_prog")
    headers = {"Authorization": f"Bearer {user['tokens']['accessToken']}"}
    today_str = date.today().isoformat()

    # Initial full check-in
    res1 = await async_client.post(
        "/api/v1/progress/records",
        json={
            "dateLogged": today_str,
            "label": "Morning",
            "weightKg": 75.0,
            "caloriesConsumed": 2300,
            "stepsCount": 9500,
            "workoutCompleted": True,
        },
        headers=headers,
    )
    assert res1.status_code == 201

    # Partial evening weight-only update
    res2 = await async_client.post(
        "/api/v1/progress/records",
        json={
            "dateLogged": today_str,
            "label": "Evening",
            "weightKg": 75.4,
        },
        headers=headers,
    )
    assert res2.status_code == 201
    updated = res2.json()
    assert updated["weightKg"] == 75.4
    assert updated["caloriesConsumed"] == 2300
    assert updated["stepsCount"] == 9500
    assert updated["workoutCompleted"] is True
