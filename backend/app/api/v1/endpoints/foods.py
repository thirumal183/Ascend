"""Food Catalog, Search, and Custom Food Management Endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db, get_optional_current_user
from app.core.rate_limit import rate_limit
from app.models.user import User
from app.schemas.nutrition import (
    CreateCustomFoodRequest,
    FoodDetailResponse,
    FoodItemResponse,
    FoodSearchResponse,
)
from app.services.nutrition_service import FoodService

router = APIRouter()


@router.get(
    "/search",
    response_model=FoodSearchResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit("foods_search", max_requests=60, window_seconds=60))],
    summary="Search food catalog with multi-tenant custom food isolation",
)
async def search_foods(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)] = None,
    q: Optional[str] = Query(default=None, min_length=2, description="Search text matching food name, aliases, or brand (min 2 chars)"),
    category: Optional[str] = Query(default=None, description="Category filter, or 'All'"),
    limit: int = Query(default=50, ge=1, le=100, description="Page limit"),
    offset: int = Query(default=0, ge=0, description="Page offset"),
) -> FoodSearchResponse:
    """Returns paginated catalog items with core macronutrients. Public items visible to all; custom items isolated to author."""
    return await FoodService.search_foods(
        db=db,
        current_user=current_user,
        q=q,
        category=category,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{food_id}",
    response_model=FoodDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve full food details and micronutrient profile",
)
async def get_food_details(
    food_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)] = None,
) -> FoodDetailResponse:
    """Returns complete reference quantities and individual micronutrient derivations."""
    return await FoodService.get_food_by_id(db=db, food_id=food_id, current_user=current_user)


@router.post(
    "/custom",
    response_model=FoodItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create custom private food item",
)
async def create_custom_food(
    payload: CreateCustomFoodRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FoodItemResponse:
    """Creates a user-owned custom food item with core macronutrients mapped into 3NF bridge."""
    return await FoodService.create_custom_food(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.delete(
    "/custom/{food_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user-owned custom food item",
)
async def delete_custom_food(
    food_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Deletes a custom food created by the authenticated user. Reference foods cannot be deleted."""
    await FoodService.delete_custom_food(db=db, food_id=food_id, current_user=current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
