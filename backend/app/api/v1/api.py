"""API v1 Router Aggregation."""

from fastapi import APIRouter
from app.api.v1.endpoints import ai, auth, foods, health, intake, progress, users, workouts

api_router = APIRouter()

# System Health & Diagnostic Endpoints
api_router.include_router(health.router)

# Authentication & Session Management Endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Sessions"])

# User Profile, Pathway & Goal Management Endpoints
api_router.include_router(users.router, prefix="/users", tags=["Users & Pathways"])

# Nutrition Domain Endpoints: Food Catalog & Intake Tracking
api_router.include_router(foods.router, prefix="/foods", tags=["Food Catalog & Search"])
api_router.include_router(intake.router, prefix="/intake", tags=["Meal Intake Logging"])

# Workout & Training Domain Endpoints
api_router.include_router(workouts.router, prefix="/workouts", tags=["Workouts & Training"])

# Progress & Biometric Telemetry Endpoints
api_router.include_router(progress.router, prefix="/progress", tags=["Progress & Biometrics"])

# AI Coaching & Recommendations Endpoints
api_router.include_router(ai.router, prefix="/ai", tags=["AI Coaching & Recommendations"])
