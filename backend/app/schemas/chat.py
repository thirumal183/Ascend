"""Pydantic v2 schemas for Conversational AI Coaching and Structured Insights."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CoachMetricItem(BaseModel):
    """Quantitative benchmark or remaining target highlighted by AI coach."""

    model_config = ConfigDict(populate_by_name=True)

    label: str
    current: str
    target: str
    status: str = Field(default="optimal", description="'optimal' | 'attention' | 'warning'")


class CoachSuggestedAction(BaseModel):
    """Interactive client-side pathway or navigation action."""

    model_config = ConfigDict(populate_by_name=True)

    label: str
    targetTab: Optional[str] = None


class CoachStructuredInsight(BaseModel):
    """Typed recommendation payload accompanying conversational guidance."""

    model_config = ConfigDict(populate_by_name=True)

    title: str
    summary: str
    metrics: List[CoachMetricItem] = Field(default_factory=list)
    suggestedAction: Optional[CoachSuggestedAction] = None
    medicalDisclaimer: str = Field(
        default="This educational coaching guidance is not medical advice. Consult a physician for clinical dietary or health prescriptions.",
        description="Mandatory scientific and legal non-medical boundary statement",
    )


class ChatMessageResponse(BaseModel):
    """Turn response containing text prose and structured telemetry."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    conversationId: uuid.UUID
    role: str
    content: str
    structuredInsight: Optional[CoachStructuredInsight] = None
    isMockResponse: bool = False
    timestamp: datetime


class AIChatRequest(BaseModel):
    """Payload to submit a user message to the AI coach."""

    model_config = ConfigDict(populate_by_name=True)

    message: str = Field(min_length=1, max_length=2000, description="User prompt or coaching query")
    conversationId: Optional[uuid.UUID] = Field(default=None, description="Optional conversation container ID")


class ConversationSummaryResponse(BaseModel):
    """Conversation summary schema."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    title: str
    messageCount: int
    createdAt: datetime
    updatedAt: datetime


class ConversationDetailResponse(BaseModel):
    """Complete conversation history with all message turns."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    title: str
    createdAt: datetime
    updatedAt: datetime
    messages: List[ChatMessageResponse] = Field(default_factory=list)
