"""AI Coach and Conversational Recommendations API Endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.core.rate_limit import rate_limit
from app.models.user import User
from app.schemas.chat import (
    AIChatRequest,
    ChatMessageResponse,
    ConversationDetailResponse,
    ConversationSummaryResponse,
)
from app.services.ai_coach_service import AICoachService

router = APIRouter()


@router.post(
    "/chat",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit("ai_chat", max_requests=20, window_seconds=60))],
    summary="Submit user query to AI Coach with live context integration",
)
async def submit_ai_chat_message(
    payload: AIChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatMessageResponse:
    """Dispatches conversational guidance synthesized with live intake totals, workout history, and biometrics."""
    return await AICoachService.process_chat_message(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.get(
    "/conversations",
    response_model=List[ConversationSummaryResponse],
    status_code=status.HTTP_200_OK,
    summary="List active user conversations",
)
async def list_conversations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> List[ConversationSummaryResponse]:
    """Returns conversation containers and turn counters for the authenticated user."""
    return await AICoachService.list_conversations(db=db, current_user=current_user)


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve full conversation history",
)
async def get_conversation_details(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationDetailResponse:
    """Returns chronological user and assistant message turns with structured insights."""
    return await AICoachService.get_conversation(
        db=db,
        current_user=current_user,
        conversation_id=conversation_id,
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation container",
)
async def delete_conversation(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Removes a conversation and cascades deletion to all turns."""
    await AICoachService.delete_conversation(
        db=db,
        current_user=current_user,
        conversation_id=conversation_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
