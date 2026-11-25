"""Comprehensive Test Suite for Authentication, JWT Lifecycle, and Session Security."""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
import jwt
from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session_factory
from app.core.exceptions import (
    AuthenticationException,
    TokenExpiredException,
    TokenReuseDetectedException,
)
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.enums import (
    ActivityLevel,
    Archetype,
    BiologicalSex,
    GoalType,
    PathwayType,
    UnitSystem,
)
from app.models.user import NutritionGoal, User, UserProfile, UserRefreshSession


# --- Unit Tests: Cryptographic Utilities ---

def test_argon2id_password_hashing():
    """Verifies that Argon2id hashing generates secure hashes and verifies correctly."""
    password = "SuperSecurePassword123!"
    hashed = hash_password(password)

    assert hashed.startswith("$argon2id$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_jwt_access_token_creation_and_expiration():
    """Verifies JWT token encoding, payload claims, and expiration validation."""
    user_id = uuid.uuid4()
    jwt_version = 2

    token = create_access_token(user_id=user_id, jwt_version=jwt_version)
    payload = decode_access_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["jwt_version"] == jwt_version
    assert payload["type"] == "access"
    assert "exp" in payload

    # Test expired token raises TokenExpiredException
    expired_payload = {
        "sub": str(user_id),
        "jwt_version": jwt_version,
        "type": "access",
        "exp": int(time.time()) - 100,
        "iat": int(time.time()) - 200,
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    with pytest.raises(TokenExpiredException):
        decode_access_token(expired_token)

    # Test invalid signature raises AuthenticationException
    with pytest.raises(AuthenticationException):
        decode_access_token(token + "tampered")


def test_refresh_token_generation_and_hashing():
    """Verifies opaque refresh token generation and SHA-256 hash reproducibility."""
    raw_token = generate_refresh_token()
    assert raw_token.startswith("ascend_rt_")

    hash1 = hash_refresh_token(raw_token)
    hash2 = hash_refresh_token(raw_token)
    assert hash1 == hash2
    assert len(hash1) == 64  # SHA-256 hex string


# --- Integration Tests: API Endpoints ---

@pytest.mark.asyncio
async def test_user_registration_and_baseline_nutrition(async_client: AsyncClient):
    """Tests POST /api/v1/auth/register creating User, UserProfile, NutritionGoal, and tokens."""
    unique_suffix = uuid.uuid4().hex[:8]
    payload = {
        "email": f"athlete_{unique_suffix}@ascend.io",
        "password": "StrongPassword123!",
        "fullName": "Alex Rivera",
        "pathway": PathwayType.ATHLETE_PERFORMANCE.value,
        "archetype": Archetype.ATHLETE_PERFORMANCE.value,
        "goalType": GoalType.MUSCLE_GAIN.value,
        "biologicalSex": BiologicalSex.MALE.value,
        "currentWeightKg": 80.0,
        "targetWeightKg": 84.0,
        "heightCm": 182.0,
        "age": 26,
        "activityLevel": ActivityLevel.VERY_ACTIVE.value,
        "unitSystem": UnitSystem.METRIC.value,
        "trainingDaysPerWeek": 5,
    }

    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert "user" in data
    assert "tokens" in data
    assert data["user"]["email"] == payload["email"].lower()
    assert data["user"]["fullName"] == "Alex Rivera"
    assert data["user"]["isActive"] is True
    assert data["tokens"]["tokenType"] == "Bearer"
    assert "accessToken" in data["tokens"]
    assert "refreshToken" in data["tokens"]

    # Verify database persistence
    user_id = uuid.UUID(data["user"]["id"])
    async with async_session_factory() as session:
        user = await session.get(User, user_id)
        assert user is not None
        assert user.jwt_version == 1

        profile = await session.scalar(select(UserProfile).where(UserProfile.user_id == user_id))
        assert profile is not None
        assert profile.pathway == PathwayType.ATHLETE_PERFORMANCE.value
        assert float(profile.protein_g_per_kg) == 2.2

        goals = await session.scalar(select(NutritionGoal).where(NutritionGoal.user_id == user_id))
        assert goals is not None
        assert goals.daily_calories > 2500
        assert float(goals.protein_g) == round(80.0 * 2.2, 1)

        # Verify active refresh session created
        sessions = (await session.scalars(select(UserRefreshSession).where(UserRefreshSession.user_id == user_id))).all()
        assert len(sessions) == 1
        assert sessions[0].is_revoked is False


@pytest.mark.asyncio
async def test_user_registration_duplicate_email(async_client: AsyncClient):
    """Tests registration with duplicate email returns 409 CONFLICT."""
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"dup_{unique_suffix}@ascend.io"

    payload = {
        "email": email,
        "password": "StrongPassword123!",
        "fullName": "Test User",
        "pathway": PathwayType.GENERAL_NUTRITION.value,
        "archetype": Archetype.GENERAL_FITNESS.value,
        "goalType": GoalType.WEIGHT_LOSS.value,
        "biologicalSex": BiologicalSex.FEMALE.value,
        "currentWeightKg": 65.0,
        "targetWeightKg": 60.0,
        "heightCm": 165.0,
        "age": 30,
        "activityLevel": ActivityLevel.MODERATELY_ACTIVE.value,
        "unitSystem": UnitSystem.METRIC.value,
        "trainingDaysPerWeek": 3,
    }

    res1 = await async_client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await async_client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    body = res2.json()
    assert body["error"]["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_login_success_and_invalid_credentials(async_client: AsyncClient):
    """Tests POST /api/v1/auth/login and /token with valid and invalid credentials."""
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"login_{unique_suffix}@ascend.io"
    password = "CorrectPassword123!"

    reg_payload = {
        "email": email,
        "password": password,
        "fullName": "Login Tester",
        "pathway": PathwayType.MUSCLE_GAIN.value,
        "archetype": Archetype.GENERAL_FITNESS.value,
        "goalType": GoalType.MUSCLE_GAIN.value,
        "biologicalSex": BiologicalSex.MALE.value,
        "currentWeightKg": 75.0,
        "targetWeightKg": 80.0,
        "heightCm": 178.0,
        "age": 24,
        "activityLevel": ActivityLevel.VERY_ACTIVE.value,
        "unitSystem": UnitSystem.METRIC.value,
        "trainingDaysPerWeek": 4,
    }
    reg_res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201

    # Test /login endpoint with JSON
    login_res = await async_client.post("/api/v1/auth/login", json={"username": email, "password": password})
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "accessToken" in token_data
    assert "refreshToken" in token_data

    # Test /token endpoint with JSON
    token_json_res = await async_client.post("/api/v1/auth/token", json={"username": email, "password": password})
    assert token_json_res.status_code == 200
    assert "accessToken" in token_json_res.json()

    # Test /token endpoint with form-urlencoded
    token_form_res = await async_client.post(
        "/api/v1/auth/token",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert token_form_res.status_code == 200
    assert "accessToken" in token_form_res.json()

    # Test invalid password
    bad_res = await async_client.post("/api/v1/auth/login", json={"username": email, "password": "WrongPassword!"})
    assert bad_res.status_code == 401
    assert bad_res.json()["error"]["code"] == "UNAUTHORIZED"

    # Test non-existent user
    unknown_res = await async_client.post(
        "/api/v1/auth/login",
        json={"username": f"nonexistent_{unique_suffix}@ascend.io", "password": password},
    )
    assert unknown_res.status_code == 401
    assert unknown_res.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_refresh_token_rotation_and_reuse_detection(async_client: AsyncClient):
    """Verifies refresh token exchange rotation and strict reuse-attack containment."""
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"reuse_{unique_suffix}@ascend.io"
    password = "StrongPassword123!"

    reg_payload = {
        "email": email,
        "password": password,
        "fullName": "Reuse Tester",
        "pathway": PathwayType.GENERAL_NUTRITION.value,
        "archetype": Archetype.GENERAL_FITNESS.value,
        "goalType": GoalType.WEIGHT_MAINTENANCE.value,
        "biologicalSex": BiologicalSex.FEMALE.value,
        "currentWeightKg": 60.0,
        "targetWeightKg": 60.0,
        "heightCm": 165.0,
        "age": 28,
        "activityLevel": ActivityLevel.LIGHTLY_ACTIVE.value,
        "unitSystem": UnitSystem.METRIC.value,
        "trainingDaysPerWeek": 3,
    }
    reg_res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    token_gen1 = reg_res.json()["tokens"]
    refresh_token_1 = token_gen1["refreshToken"]
    user_id = uuid.UUID(reg_res.json()["user"]["id"])

    # 1. Normal rotation: Exchange Gen 1 refresh token for Gen 2
    rotate_res = await async_client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token_1})
    assert rotate_res.status_code == 200
    token_gen2 = rotate_res.json()
    refresh_token_2 = token_gen2["refreshToken"]
    assert refresh_token_2 != refresh_token_1

    # Verify in DB: Gen 1 is revoked, Gen 2 is active
    async with async_session_factory() as session:
        hash_1 = hash_refresh_token(refresh_token_1)
        sess_1 = await session.scalar(select(UserRefreshSession).where(UserRefreshSession.token_hash == hash_1))
        assert sess_1.is_revoked is True

        hash_2 = hash_refresh_token(refresh_token_2)
        sess_2 = await session.scalar(select(UserRefreshSession).where(UserRefreshSession.token_hash == hash_2))
        assert sess_2.is_revoked is False
        assert sess_1.replaced_by_token_id == sess_2.id
        assert sess_2.replaced_by_token_id is None

    # 2. REUSE ATTACK: Present revoked Gen 1 refresh token again!
    replay_res = await async_client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token_1})
    assert replay_res.status_code == 401
    replay_err = replay_res.json()
    assert replay_err["error"]["code"] == "REUSE_DETECTED"

    # 3. Verify ALL sessions for the user have been revoked and jwt_version incremented
    async with async_session_factory() as session:
        user = await session.get(User, user_id)
        assert user.jwt_version == 2

        active_sessions = (
            await session.scalars(
                select(UserRefreshSession).where(
                    UserRefreshSession.user_id == user_id,
                    UserRefreshSession.is_revoked == False,  # noqa: E712
                )
            )
        ).all()
        assert len(active_sessions) == 0  # ALL sessions revoked!

    # 4. Previously active Gen 2 token should now also fail
    gen2_res = await async_client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token_2})
    assert gen2_res.status_code == 401


@pytest.mark.asyncio
async def test_session_management_and_revocation(async_client: AsyncClient):
    """Tests GET /api/v1/auth/sessions and DELETE /api/v1/auth/sessions/{session_id}."""
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"sess_{unique_suffix}@ascend.io"
    password = "StrongPassword123!"

    reg_payload = {
        "email": email,
        "password": password,
        "fullName": "Session Tester",
        "pathway": PathwayType.ATHLETE_PERFORMANCE.value,
        "archetype": Archetype.ATHLETE_PERFORMANCE.value,
        "goalType": GoalType.WEIGHT_MAINTENANCE.value,
        "biologicalSex": BiologicalSex.MALE.value,
        "currentWeightKg": 70.0,
        "targetWeightKg": 70.0,
        "heightCm": 175.0,
        "age": 29,
        "activityLevel": ActivityLevel.VERY_ACTIVE.value,
        "unitSystem": UnitSystem.METRIC.value,
        "trainingDaysPerWeek": 5,
    }
    reg_res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    access_token = reg_res.json()["tokens"]["accessToken"]

    # Log in again to create a second session
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"username": email, "password": password},
        headers={"User-Agent": "Second Device/1.0"},
    )
    assert login_res.status_code == 200

    # List sessions
    headers = {"Authorization": f"Bearer {access_token}"}
    sessions_res = await async_client.get("/api/v1/auth/sessions", headers=headers)
    assert sessions_res.status_code == 200
    session_list = sessions_res.json()["sessions"]
    assert len(session_list) == 2

    # Delete one remote session
    session_to_delete = session_list[0]["id"]
    del_res = await async_client.delete(f"/api/v1/auth/sessions/{session_to_delete}", headers=headers)
    assert del_res.status_code == 204

    # List again -> 1 active session remaining
    sessions_res2 = await async_client.get("/api/v1/auth/sessions", headers=headers)
    assert sessions_res2.status_code == 200
    assert len(sessions_res2.json()["sessions"]) == 1


@pytest.mark.asyncio
async def test_logout_flows(async_client: AsyncClient):
    """Tests single-device logout vs global session invalidation."""
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"logout_{unique_suffix}@ascend.io"
    password = "StrongPassword123!"

    reg_payload = {
        "email": email,
        "password": password,
        "fullName": "Logout Tester",
        "pathway": PathwayType.GENERAL_NUTRITION.value,
        "archetype": Archetype.GENERAL_FITNESS.value,
        "goalType": GoalType.WEIGHT_LOSS.value,
        "biologicalSex": BiologicalSex.FEMALE.value,
        "currentWeightKg": 62.0,
        "targetWeightKg": 58.0,
        "heightCm": 160.0,
        "age": 25,
        "activityLevel": ActivityLevel.MODERATELY_ACTIVE.value,
        "unitSystem": UnitSystem.METRIC.value,
        "trainingDaysPerWeek": 4,
    }
    reg_res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    tokens = reg_res.json()["tokens"]
    access_token = tokens["accessToken"]
    refresh_token = tokens["refreshToken"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # 1. Single session logout (supplying refreshToken)
    logout_res = await async_client.post(
        "/api/v1/auth/logout",
        json={"refreshToken": refresh_token},
        headers=headers,
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["message"] == "Successfully logged out."

    # Refresh with that token should now fail
    ref_res = await async_client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token})
    assert ref_res.status_code == 401  # REUSE_DETECTED because session is revoked

    # 2. Global logout (omitting refreshToken)
    # Log in again first to get fresh tokens
    fresh_login = await async_client.post("/api/v1/auth/login", json={"username": email, "password": password})
    fresh_access = fresh_login.json()["accessToken"]
    fresh_headers = {"Authorization": f"Bearer {fresh_access}"}

    global_logout = await async_client.post(
        "/api/v1/auth/logout",
        json={"logoutAll": True},
        headers=fresh_headers,
    )
    assert global_logout.status_code == 200

    # Old JWT with stale jwt_version should now fail on protected routes!
    me_res = await async_client.get("/api/v1/auth/me", headers=fresh_headers)
    assert me_res.status_code == 401
    assert me_res.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_auth_me_endpoint_and_authorization_guards(async_client: AsyncClient):
    """Tests GET /api/v1/auth/me returns full user profile and goals, and enforces auth."""
    # Test without token -> 401 UNAUTHORIZED
    unauth_res = await async_client.get("/api/v1/auth/me")
    assert unauth_res.status_code == 401
    assert unauth_res.json()["error"]["code"] == "UNAUTHORIZED"

    # Test with invalid token
    bad_token_res = await async_client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert bad_token_res.status_code == 401

    # Register user and access /me
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"me_{unique_suffix}@ascend.io"
    reg_payload = {
        "email": email,
        "password": "StrongPassword123!",
        "fullName": "Me Endpoint Tester",
        "pathway": PathwayType.GENERAL_NUTRITION.value,
        "archetype": Archetype.GENERAL_FITNESS.value,
        "goalType": GoalType.WEIGHT_LOSS.value,
        "biologicalSex": BiologicalSex.FEMALE.value,
        "currentWeightKg": 68.0,
        "targetWeightKg": 62.0,
        "heightCm": 168.0,
        "age": 27,
        "activityLevel": ActivityLevel.MODERATELY_ACTIVE.value,
        "unitSystem": UnitSystem.METRIC.value,
        "trainingDaysPerWeek": 4,
    }
    reg_res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    access_token = reg_res.json()["tokens"]["accessToken"]

    me_res = await async_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 200
    data = me_res.json()

    assert "account" in data
    assert "userProfile" in data
    assert "nutritionGoals" in data
    assert data["account"]["email"] == email.lower()
    assert data["userProfile"]["pathway"] == PathwayType.GENERAL_NUTRITION.value
    assert data["nutritionGoals"]["dailyCalories"] > 0
    assert data["nutritionGoals"]["proteinG"] > 0


@pytest.mark.asyncio
async def test_users_profile_pathway_and_goals_endpoints(async_client: AsyncClient):
    """AUD-P1-04 & AUD-P1-07: Verifies /users/me/profile, /users/me/pathway, /users/me/goals & calculator bounds."""
    from app.services.nutrition_calculator import compute_recommended_targets

    # Verify pathway baselines and safety bounds
    cals_ath, prot_ath, _, _, water_ath, _, _ = compute_recommended_targets(
        weight_kg=70.0,
        height_cm=175.0,
        age=26,
        biological_sex=BiologicalSex.MALE,
        activity_level=ActivityLevel.EXTREMELY_ACTIVE,
        pathway=PathwayType.ATHLETE_PERFORMANCE,
        goal_type=GoalType.ATHLETIC_PERFORMANCE,
    )
    assert float(prot_ath) == round(70.0 * 2.2, 1)
    assert water_ath == int(round(70.0 * 36.0)) + 450
    assert cals_ath <= 6000

    # Verify caloric floor on tiny female deficit
    cals_floor, _, _, _, _, _, _ = compute_recommended_targets(
        weight_kg=45.0,
        height_cm=150.0,
        age=45,
        biological_sex=BiologicalSex.FEMALE,
        activity_level=ActivityLevel.SEDENTARY,
        pathway=PathwayType.GENERAL_NUTRITION,
        goal_type=GoalType.WEIGHT_LOSS,
    )
    assert cals_floor >= 1200

    # Register user and test /users/me/* endpoints
    unique_suffix = uuid.uuid4().hex[:8]
    reg_payload = {
        "email": f"users_ep_{unique_suffix}@ascend.io",
        "password": "StrongPassword123!",
        "fullName": "Users Endpoint Tester",
        "pathway": PathwayType.GENERAL_NUTRITION.value,
        "archetype": Archetype.GENERAL_FITNESS.value,
        "goalType": GoalType.WEIGHT_LOSS.value,
        "biologicalSex": BiologicalSex.MALE.value,
        "currentWeightKg": 80.0,
        "targetWeightKg": 75.0,
        "heightCm": 178.0,
        "age": 30,
        "activityLevel": ActivityLevel.MODERATELY_ACTIVE.value,
        "unitSystem": UnitSystem.METRIC.value,
        "trainingDaysPerWeek": 4,
    }
    reg_res = await async_client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    headers = {"Authorization": f"Bearer {reg_res.json()['tokens']['accessToken']}"}

    # Switch pathway to Weight Gain & Muscle Gain (requires currentPassword)
    pw_res = await async_client.post(
        "/api/v1/users/me/pathway",
        json={
            "pathway": PathwayType.MUSCLE_GAIN.value,
            "currentPassword": "StrongPassword123!",
            "recalculateGoals": True,
        },
        headers=headers,
    )
    assert pw_res.status_code == 200
    assert pw_res.json()["userProfile"]["pathway"] == PathwayType.MUSCLE_GAIN.value
    assert float(pw_res.json()["nutritionGoals"]["proteinG"]) == round(80.0 * 2.1, 1)

    # Update profile weight
    prof_res = await async_client.put(
        "/api/v1/users/me/profile",
        json={"currentWeightKg": 82.0, "recalculateGoals": True},
        headers=headers,
    )
    assert prof_res.status_code == 200
    assert prof_res.json()["userProfile"]["currentWeightKg"] == 82.0
    assert float(prof_res.json()["nutritionGoals"]["proteinG"]) == round(82.0 * 2.1, 1)

    # Custom goals update
    goals_res = await async_client.put(
        "/api/v1/users/me/goals",
        json={
            "dailyCalories": 3250,
            "proteinG": 185.0,
            "carbsG": 400.0,
            "fatG": 90.0,
            "waterMl": 3200,
        },
        headers=headers,
    )
    assert goals_res.status_code == 200
    assert goals_res.json()["dailyCalories"] == 3250


@pytest.mark.asyncio
async def test_wave2_security_hardening_rate_limit_password_limit_and_lineage(async_client: AsyncClient):
    """AUD-P2-01, AUD-P2-04, AUD-P2-10: Tests password max_length, standardized 422 envelope, refresh lineage, and rate limiting."""
    from app.core.config import settings
    from app.core.rate_limit import rate_limiter

    # 1. Oversized password rejected with standardized VALIDATION_ERROR envelope
    big_pw_res = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "nobody@ascend.io", "password": "A" * 200},
    )
    assert big_pw_res.status_code == 422
    assert big_pw_res.json()["error"]["code"] == "VALIDATION_ERROR"

    # 2. Refresh token replacement lineage points old -> new
    unique_suffix = uuid.uuid4().hex[:8]
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": f"lineage_{unique_suffix}@ascend.io",
            "password": "StrongPassword123!",
            "fullName": "Lineage Tester",
            "pathway": PathwayType.GENERAL_NUTRITION.value,
            "archetype": Archetype.GENERAL_FITNESS.value,
            "goalType": GoalType.WEIGHT_LOSS.value,
            "biologicalSex": BiologicalSex.MALE.value,
            "currentWeightKg": 75.0,
            "targetWeightKg": 70.0,
            "heightCm": 175.0,
            "age": 28,
            "activityLevel": ActivityLevel.MODERATELY_ACTIVE.value,
            "unitSystem": UnitSystem.METRIC.value,
            "trainingDaysPerWeek": 3,
        },
    )
    assert reg_res.status_code == 201
    old_refresh = reg_res.json()["tokens"]["refreshToken"]

    rot_res = await async_client.post("/api/v1/auth/refresh", json={"refreshToken": old_refresh})
    assert rot_res.status_code == 200
    new_refresh = rot_res.json()["refreshToken"]

    from app.core.security import hash_refresh_token
    async with async_session_factory() as session:
        old_row = await session.scalar(
            select(UserRefreshSession).where(UserRefreshSession.token_hash == hash_refresh_token(old_refresh))
        )
        new_row = await session.scalar(
            select(UserRefreshSession).where(UserRefreshSession.token_hash == hash_refresh_token(new_refresh))
        )
        assert old_row is not None and new_row is not None
        assert old_row.is_revoked is True
        assert old_row.replaced_by_token_id == new_row.id
        assert new_row.replaced_by_token_id is None

    # 3. Rate limiter triggers 429 RATE_LIMITED after burst
    await rate_limiter.reset()
    settings.RATE_LIMIT_ENABLED = True
    try:
        statuses = []
        for _ in range(12):
            r = await async_client.post(
                "/api/v1/auth/login",
                json={"username": "nobody@ascend.io", "password": "WrongPassword1!"},
            )
            statuses.append(r.status_code)
        assert 429 in statuses
    finally:
        settings.RATE_LIMIT_ENABLED = False
        await rate_limiter.reset()


@pytest.mark.asyncio
async def test_httponly_refresh_cookie_and_csrf_protection(async_client: AsyncClient):
    """Verifies HttpOnly refresh cookie issuance, CSRF header enforcement, rotation, and logout clearing."""
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"cookie_{unique_suffix}@ascend.io"
    password = "CookiePassword123!"

    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "fullName": "Cookie Tester",
            "pathway": PathwayType.GENERAL_NUTRITION.value,
            "archetype": Archetype.GENERAL_FITNESS.value,
            "goalType": GoalType.WEIGHT_MAINTENANCE.value,
            "biologicalSex": BiologicalSex.FEMALE.value,
            "currentWeightKg": 62.0,
            "targetWeightKg": 62.0,
            "heightCm": 165.0,
            "age": 27,
            "activityLevel": ActivityLevel.MODERATELY_ACTIVE.value,
            "unitSystem": UnitSystem.METRIC.value,
            "trainingDaysPerWeek": 3,
        },
    )
    assert reg_res.status_code == 201
    set_cookie_header = reg_res.headers.get("set-cookie", "")
    assert "ascend_refresh_token=" in set_cookie_header
    assert "httponly" in set_cookie_header.lower()

    # Cookie-based refresh without X-Requested-With CSRF header must fail with 403
    csrf_fail = await async_client.post("/api/v1/auth/refresh", json={})
    assert csrf_fail.status_code == 403

    # Cookie-based refresh WITH X-Requested-With header succeeds and rotates token
    csrf_ok = await async_client.post(
        "/api/v1/auth/refresh",
        json={},
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert csrf_ok.status_code == 200
    rotated_access = csrf_ok.json()["accessToken"]
    assert "ascend_refresh_token=" in csrf_ok.headers.get("set-cookie", "")

    # Cookie-based logout WITH Authorization + X-Requested-With succeeds and revokes session
    logout_ok = await async_client.post(
        "/api/v1/auth/logout",
        json={},
        headers={
            "Authorization": f"Bearer {rotated_access}",
            "X-Requested-With": "XMLHttpRequest",
        },
    )
    assert logout_ok.status_code == 200

    # Refresh after logout must fail
    post_logout_refresh = await async_client.post(
        "/api/v1/auth/refresh",
        json={},
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert post_logout_refresh.status_code == 401


@pytest.mark.asyncio
async def test_production_same_origin_cookie_attributes(async_client: AsyncClient):
    """Verifies HttpOnly, Secure, SameSite=Lax, and Path=/api/v1/auth in production."""
    from app.api.v1.endpoints.auth import _cookie_security_params

    original_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        params = _cookie_security_params()
        assert params["httponly"] is True
        assert params["secure"] is True
        assert params["samesite"] == "lax"
        assert params["path"] == "/api/v1/auth"
    finally:
        settings.ENVIRONMENT = original_env


@pytest.mark.asyncio
async def test_pathway_change_password_verification_and_history_preservation(async_client: AsyncClient):
    """Verifies password confirmation requirement for pathway changes, bypass prevention, and record preservation."""
    from datetime import date

    unique_suffix = uuid.uuid4().hex[:8]
    password = "PathwayPassword123!"
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": f"pw_verify_{unique_suffix}@ascend.io",
            "password": password,
            "fullName": "Pathway Verifier",
            "pathway": PathwayType.GENERAL_NUTRITION.value,
            "archetype": Archetype.GENERAL_FITNESS.value,
            "goalType": GoalType.WEIGHT_LOSS.value,
            "biologicalSex": BiologicalSex.MALE.value,
            "currentWeightKg": 76.0,
            "targetWeightKg": 72.0,
            "heightCm": 176.0,
            "age": 28,
            "activityLevel": ActivityLevel.MODERATELY_ACTIVE.value,
            "unitSystem": UnitSystem.METRIC.value,
            "trainingDaysPerWeek": 4,
        },
    )
    assert reg_res.status_code == 201
    access_token = reg_res.json()["tokens"]["accessToken"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Seed historical data (water + progress) that must be preserved after pathway change
    today_iso = date.today().isoformat()
    w_res = await async_client.post(
        "/api/v1/intake/water",
        json={"amountMl": 500, "dateIso": today_iso},
        headers=headers,
    )
    assert w_res.status_code == 201
    p_res = await async_client.post(
        "/api/v1/progress/records",
        json={"dateLogged": today_iso, "weightKg": 76.0},
        headers=headers,
    )
    assert p_res.status_code in (200, 201)

    # 1. Unauthenticated access rejected
    unauth_verify = await async_client.post("/api/v1/auth/verify-password", json={"password": password})
    assert unauth_verify.status_code == 401
    unauth_pw = await async_client.post(
        "/api/v1/users/me/pathway",
        json={"pathway": PathwayType.ATHLETE_PERFORMANCE.value, "currentPassword": password},
    )
    assert unauth_pw.status_code == 401

    # 2. Missing currentPassword -> 422
    missing_pw = await async_client.post(
        "/api/v1/users/me/pathway",
        json={"pathway": PathwayType.ATHLETE_PERFORMANCE.value},
        headers=headers,
    )
    assert missing_pw.status_code == 422

    # 3. Incorrect password -> 401 on /verify-password and /me/pathway; pathway remains unchanged
    bad_verify = await async_client.post(
        "/api/v1/auth/verify-password",
        json={"password": "WrongPassword!"},
        headers=headers,
    )
    assert bad_verify.status_code == 401

    bad_pw = await async_client.post(
        "/api/v1/users/me/pathway",
        json={"pathway": PathwayType.ATHLETE_PERFORMANCE.value, "currentPassword": "WrongPassword!"},
        headers=headers,
    )
    assert bad_pw.status_code == 401

    # 4. Attempt to bypass via PUT /users/me/profile -> 403 Forbidden
    bypass_res = await async_client.put(
        "/api/v1/users/me/profile",
        json={"pathway": PathwayType.ATHLETE_PERFORMANCE.value},
        headers=headers,
    )
    assert bypass_res.status_code == 403

    me_before = await async_client.get("/api/v1/auth/me", headers=headers)
    assert me_before.json()["userProfile"]["pathway"] == PathwayType.GENERAL_NUTRITION.value

    # 5. Valid password verification + atomic pathway change
    ok_verify = await async_client.post(
        "/api/v1/auth/verify-password",
        json={"password": password},
        headers=headers,
    )
    assert ok_verify.status_code == 200
    assert ok_verify.json()["verified"] is True

    ok_pw = await async_client.post(
        "/api/v1/users/me/pathway",
        json={
            "pathway": PathwayType.ATHLETE_PERFORMANCE.value,
            "currentPassword": password,
            "recalculateGoals": True,
        },
        headers=headers,
    )
    assert ok_pw.status_code == 200
    assert ok_pw.json()["userProfile"]["pathway"] == PathwayType.ATHLETE_PERFORMANCE.value

    # 6. Historical water and progress records preserved intact
    water_after = await async_client.get(f"/api/v1/intake/water?date_iso={today_iso}", headers=headers)
    assert water_after.status_code == 200
    assert water_after.json()["totalMl"] == 500
    prog_after = await async_client.get("/api/v1/progress/records", headers=headers)
    assert prog_after.status_code == 200
    assert len(prog_after.json()) >= 1
