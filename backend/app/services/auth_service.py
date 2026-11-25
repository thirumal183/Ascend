"""Authentication and Session Management Business Logic Service."""

from __future__ import annotations

import asyncio
import math
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import (
    AuthenticationException,
    DuplicateEntityException,
    EntityNotFoundException,
    TokenExpiredException,
    TokenReuseDetectedException,
)
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.enums import (
    ActivityLevel,
    BiologicalSex,
    GoalType,
    PathwayType,
    UnitSystem,
)
from app.models.user import NutritionGoal, User, UserProfile, UserRefreshSession
from app.schemas.auth import (
    AuthMeResponse,
    NutritionGoalResponse,
    RegisterResponse,
    SessionItem,
    SessionListResponse,
    TokenResponse,
    UserProfileResponse,
    UserRegisterRequest,
    UserResponse,
)


from app.services.nutrition_calculator import compute_recommended_targets


def calculate_baseline_nutrition(payload: UserRegisterRequest) -> tuple[int, Decimal, Decimal, Decimal, int]:
    """Calculates scientifically grounded baseline caloric and macronutrient targets (Mifflin-St Jeor)."""
    cals, prot, carbs, fat, water, _, _ = compute_recommended_targets(
        weight_kg=payload.currentWeightKg,
        height_cm=payload.heightCm,
        age=payload.age,
        biological_sex=payload.biologicalSex,
        activity_level=payload.activityLevel,
        pathway=payload.pathway,
        goal_type=payload.goalType,
    )
    return cals, prot, carbs, fat, water


_DUMMY_PASSWORD_HASH: Optional[str] = None


def _get_dummy_password_hash() -> str:
    global _DUMMY_PASSWORD_HASH
    if _DUMMY_PASSWORD_HASH is None:
        _DUMMY_PASSWORD_HASH = hash_password("ascend-timing-equalizer")
    return _DUMMY_PASSWORD_HASH


class AuthService:
    """Manages credential validation, token rotation, and multi-device sessions."""

    @staticmethod
    async def register_user(
        db: AsyncSession,
        payload: UserRegisterRequest,
        client_info: Optional[Dict[str, str]] = None,
    ) -> RegisterResponse:
        normalized_email = payload.email.strip().lower()

        # Check existing user
        existing_user = await db.scalar(select(User).where(User.email == normalized_email))
        if existing_user:
            raise DuplicateEntityException(f"User with email '{normalized_email}' already exists.")

        # Hash password off the event loop
        pwd_hash = await asyncio.to_thread(hash_password, payload.password)

        # Create user
        user = User(
            email=normalized_email,
            password_hash=pwd_hash,
            full_name=payload.fullName.strip(),
            is_active=True,
            jwt_version=1,
        )
        db.add(user)
        await db.flush()

        # Create user profile
        profile = UserProfile(
            user_id=user.id,
            pathway=payload.pathway.value if hasattr(payload.pathway, "value") else str(payload.pathway),
            archetype=payload.archetype.value if hasattr(payload.archetype, "value") else str(payload.archetype),
            goal_type=payload.goalType.value if hasattr(payload.goalType, "value") else str(payload.goalType),
            biological_sex=payload.biologicalSex.value if hasattr(payload.biologicalSex, "value") else str(payload.biologicalSex),
            unit_system=payload.unitSystem.value if hasattr(payload.unitSystem, "value") else str(payload.unitSystem),
            current_weight_kg=Decimal(str(payload.currentWeightKg)),
            target_weight_kg=Decimal(str(payload.targetWeightKg)),
            height_cm=Decimal(str(payload.heightCm)),
            age=payload.age,
            activity_level=payload.activityLevel.value if hasattr(payload.activityLevel, "value") else str(payload.activityLevel),
            training_days_per_week=payload.trainingDaysPerWeek,
            protein_g_per_kg=Decimal("2.20") if payload.pathway == PathwayType.ATHLETE_PERFORMANCE else (Decimal("2.10") if payload.pathway == PathwayType.MUSCLE_GAIN else Decimal("1.80")),
            water_ml_per_kg=Decimal("36.0"),
        )
        db.add(profile)

        # Create nutrition goals
        cals, prot, carbs, fat, water = calculate_baseline_nutrition(payload)
        goals = NutritionGoal(
            user_id=user.id,
            daily_calories=cals,
            protein_g=prot,
            carbs_g=carbs,
            fat_g=fat,
            water_ml=water,
            daily_steps=10000,
            weekly_workout_sessions=payload.trainingDaysPerWeek,
            weekly_activity_minutes=payload.trainingDaysPerWeek * 45,
        )
        db.add(goals)

        # Issue tokens and create session
        access_token = create_access_token(user.id, user.jwt_version)
        raw_refresh_token = generate_refresh_token()
        token_hash = hash_refresh_token(raw_refresh_token)

        info = client_info or {}
        session_record = UserRefreshSession(
            user_id=user.id,
            token_hash=token_hash,
            device_info=info.get("device_info"),
            ip_address=info.get("ip_address"),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            is_revoked=False,
        )
        db.add(session_record)

        await db.commit()
        await db.refresh(user)

        user_resp = UserResponse(
            id=user.id,
            email=user.email,
            fullName=user.full_name,
            isActive=user.is_active,
            jwtVersion=user.jwt_version,
        )
        tokens_resp = TokenResponse(
            accessToken=access_token,
            refreshToken=raw_refresh_token,
            expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
        return RegisterResponse(user=user_resp, tokens=tokens_resp)

    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        username: str,
        password: str,
        client_info: Optional[Dict[str, str]] = None,
    ) -> TokenResponse:
        normalized_email = username.strip().lower()
        user = await db.scalar(select(User).where(User.email == normalized_email))

        if not user:
            # Equalize Argon2id verification latency to prevent timing-based email enumeration
            await asyncio.to_thread(verify_password, password, _get_dummy_password_hash())
            raise AuthenticationException("Invalid email or password.")

        if not await asyncio.to_thread(verify_password, password, user.password_hash):
            raise AuthenticationException("Invalid email or password.")

        if not user.is_active:
            raise AuthenticationException("Account has been deactivated.")

        access_token = create_access_token(user.id, user.jwt_version)
        raw_refresh_token = generate_refresh_token()
        token_hash = hash_refresh_token(raw_refresh_token)

        info = client_info or {}
        session_record = UserRefreshSession(
            user_id=user.id,
            token_hash=token_hash,
            device_info=info.get("device_info"),
            ip_address=info.get("ip_address"),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            is_revoked=False,
        )
        db.add(session_record)
        await db.commit()

        return TokenResponse(
            accessToken=access_token,
            refreshToken=raw_refresh_token,
            expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    @staticmethod
    async def rotate_refresh_token(
        db: AsyncSession,
        raw_refresh_token: str,
        client_info: Optional[Dict[str, str]] = None,
    ) -> TokenResponse:
        current_hash = hash_refresh_token(raw_refresh_token)

        # Lookup session with row-level lock to prevent concurrent refresh races
        session = await db.scalar(
            select(UserRefreshSession)
            .where(UserRefreshSession.token_hash == current_hash)
            .with_for_update()
        )

        if not session:
            raise AuthenticationException("Invalid refresh token.")

        now = datetime.now(timezone.utc)

        # REUSE DETECTION: An already revoked token was presented!
        if session.is_revoked:
            # Token theft / replay attack: Revoke ALL sessions for this user and increment jwt_version
            await db.execute(
                update(UserRefreshSession)
                .where(UserRefreshSession.user_id == session.user_id)
                .values(is_revoked=True)
            )
            await db.execute(
                update(User)
                .where(User.id == session.user_id)
                .values(jwt_version=User.jwt_version + 1)
            )
            await db.commit()
            raise TokenReuseDetectedException(
                "Token reuse detected. All active sessions have been revoked for security."
            )

        # Check expiration
        if session.expires_at < now:
            session.is_revoked = True
            await db.commit()
            raise TokenExpiredException("Refresh token has expired.")

        # Invalidate old session
        session.is_revoked = True

        # Generate new refresh token & session record
        new_raw_token = generate_refresh_token()
        new_hash = hash_refresh_token(new_raw_token)

        info = client_info or {}
        new_session = UserRefreshSession(
            user_id=session.user_id,
            token_hash=new_hash,
            device_info=info.get("device_info", session.device_info),
            ip_address=info.get("ip_address", session.ip_address),
            expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            is_revoked=False,
            replaced_by_token_id=None,
        )
        db.add(new_session)
        await db.flush()
        session.replaced_by_token_id = new_session.id

        # Fetch current user jwt_version
        user = await db.get(User, session.user_id)
        if not user or not user.is_active:
            raise AuthenticationException("User account is inactive or not found.")

        new_access_token = create_access_token(user.id, user.jwt_version)

        await db.commit()

        return TokenResponse(
            accessToken=new_access_token,
            refreshToken=new_raw_token,
            expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    @staticmethod
    async def logout(
        db: AsyncSession,
        user: User,
        raw_refresh_token: Optional[str] = None,
        logout_all: bool = False,
    ) -> None:
        if logout_all:
            # Explicit global logout across all devices
            await db.execute(
                update(UserRefreshSession)
                .where(UserRefreshSession.user_id == user.id)
                .values(is_revoked=True)
            )
            user.jwt_version += 1
        elif raw_refresh_token:
            current_hash = hash_refresh_token(raw_refresh_token)
            await db.execute(
                update(UserRefreshSession)
                .where(
                    UserRefreshSession.user_id == user.id,
                    UserRefreshSession.token_hash == current_hash,
                )
                .values(is_revoked=True)
            )

        await db.commit()

    @staticmethod
    async def list_sessions(
        db: AsyncSession,
        user_id: uuid.UUID,
        current_token_hash: Optional[str] = None,
    ) -> SessionListResponse:
        now = datetime.now(timezone.utc)
        stmt = (
            select(UserRefreshSession)
            .where(
                UserRefreshSession.user_id == user_id,
                UserRefreshSession.is_revoked == False,  # noqa: E712
                UserRefreshSession.expires_at > now,
            )
            .order_by(UserRefreshSession.created_at.desc())
        )
        sessions = (await db.scalars(stmt)).all()

        items = [
            SessionItem(
                id=s.id,
                deviceInfo=s.device_info,
                ipAddress=s.ip_address,
                createdAt=s.created_at,
                expiresAt=s.expires_at,
                isCurrent=(s.token_hash == current_token_hash) if current_token_hash else False,
            )
            for s in sessions
        ]
        return SessionListResponse(sessions=items)

    @staticmethod
    async def revoke_session(
        db: AsyncSession,
        user_id: uuid.UUID,
        session_id: uuid.UUID,
    ) -> None:
        session = await db.scalar(
            select(UserRefreshSession).where(
                UserRefreshSession.id == session_id,
                UserRefreshSession.user_id == user_id,
            )
        )
        if not session:
            raise EntityNotFoundException("Session not found or belongs to another user.")

        session.is_revoked = True
        await db.commit()

    @staticmethod
    async def get_me(db: AsyncSession, user_id: uuid.UUID) -> AuthMeResponse:
        stmt = (
            select(User)
            .options(selectinload(User.profile), selectinload(User.nutrition_goals))
            .where(User.id == user_id)
        )
        user = await db.scalar(stmt)
        if not user:
            raise EntityNotFoundException("User account not found.")

        user_resp = UserResponse(
            id=user.id,
            email=user.email,
            fullName=user.full_name,
            isActive=user.is_active,
            jwtVersion=user.jwt_version,
        )

        profile_resp = None
        if user.profile:
            profile_resp = UserProfileResponse(
                id=user.profile.id,
                userId=user.profile.user_id,
                pathway=user.profile.pathway,
                archetype=user.profile.archetype,
                goalType=user.profile.goal_type,
                biologicalSex=user.profile.biological_sex,
                unitSystem=user.profile.unit_system,
                currentWeightKg=float(user.profile.current_weight_kg),
                targetWeightKg=float(user.profile.target_weight_kg),
                heightCm=float(user.profile.height_cm),
                age=user.profile.age,
                activityLevel=user.profile.activity_level,
                trainingDaysPerWeek=user.profile.training_days_per_week,
                targetCalorieAdjustment=user.profile.target_calorie_adjustment,
                proteinGPerKg=float(user.profile.protein_g_per_kg),
                waterMlPerKg=float(user.profile.water_ml_per_kg),
                updatedAt=user.profile.updated_at,
            )

        goals_resp = None
        if user.nutrition_goals:
            goals_resp = NutritionGoalResponse(
                id=user.nutrition_goals.id,
                userId=user.nutrition_goals.user_id,
                dailyCalories=user.nutrition_goals.daily_calories,
                proteinG=float(user.nutrition_goals.protein_g),
                carbsG=float(user.nutrition_goals.carbs_g),
                fatG=float(user.nutrition_goals.fat_g),
                waterMl=user.nutrition_goals.water_ml,
                dailySteps=user.nutrition_goals.daily_steps,
                weeklyWorkoutSessions=user.nutrition_goals.weekly_workout_sessions,
                weeklyActivityMinutes=user.nutrition_goals.weekly_activity_minutes,
                updatedAt=user.nutrition_goals.updated_at,
            )

        return AuthMeResponse(
            account=user_resp,
            userProfile=profile_resp,
            nutritionGoals=goals_resp,
        )
