"""Comprehensive Test Suite for AI Coach Integration, Gemini Gateway, Heuristic Engine, and Conversations."""

from __future__ import annotations

import uuid
from datetime import date
from unittest.mock import AsyncMock, patch
import httpx
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.enums import ActivityLevel, BiologicalSex, GoalType, PathwayType, UnitSystem
from app.models.user import User
from app.services.ai_coach_service import AICoachService


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


# --- Unit Tests: Heuristic Engine & Context Aggregation ---

def test_pathway_heuristic_coaching_outputs():
    """Verifies that the heuristic engine produces tailored outputs and non-medical disclaimers."""
    context_athlete = {
        "pathway": PathwayType.ATHLETE_PERFORMANCE.value,
        "caloriesRemaining": 540,
        "proteinRemaining": 36.0,
        "loggedCalories": 2200,
        "loggedProtein": 140.0,
    }
    prose, insight = AICoachService.generate_pathway_heuristic_response("What should I eat?", context_athlete)

    assert "Athlete Performance" in prose
    assert "540 kcal" in prose
    assert "36.0g" in prose
    assert len(insight.metrics) == 2
    assert "not medical advice" in insight.medicalDisclaimer.lower()

    context_muscle = {
        "pathway": PathwayType.MUSCLE_GAIN.value,
        "caloriesRemaining": 400,
        "proteinRemaining": 25.0,
        "loggedCalories": 2600,
        "loggedProtein": 160.0,
    }
    prose_m, insight_m = AICoachService.generate_pathway_heuristic_response("Post workout dinner?", context_muscle)
    assert "surplus" in prose_m.lower() or "hypertrophic" in prose_m.lower()
    assert "not medical advice" in insight_m.medicalDisclaimer.lower()


# --- Integration Tests: AI Chat & Conversation Persistence ---

@pytest.mark.asyncio
async def test_ai_chat_flow_and_message_persistence(async_client: AsyncClient):
    """Verifies conversational turns, message persistence, and conversation continuity."""
    user = await create_test_user_and_token(async_client, "coach_user")
    headers = {"Authorization": f"Bearer {user['tokens']['accessToken']}"}

    # 1. Send first message without conversationId (creates new conversation)
    msg1_payload = {
        "message": "What should I eat for dinner to reach my protein target without blowing my calories?",
    }
    res1 = await async_client.post("/api/v1/ai/chat", json=msg1_payload, headers=headers)
    assert res1.status_code == 200
    turn1 = res1.json()

    assert turn1["role"] == "assistant"
    assert turn1["isMockResponse"] is True  # Heuristic fallback active because no live key configured
    assert turn1["structuredInsight"] is not None
    assert "not medical advice" in turn1["structuredInsight"]["medicalDisclaimer"].lower()
    conversation_id = turn1["conversationId"]

    # 2. Send follow-up turn referencing existing conversationId
    msg2_payload = {
        "message": "Can I have salmon and sweet potato?",
        "conversationId": conversation_id,
    }
    res2 = await async_client.post("/api/v1/ai/chat", json=msg2_payload, headers=headers)
    assert res2.status_code == 200
    turn2 = res2.json()
    assert turn2["conversationId"] == conversation_id

    # 3. Retrieve conversation history
    detail_res = await async_client.get(f"/api/v1/ai/conversations/{conversation_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == conversation_id
    assert len(detail["messages"]) == 4  # User1, Assistant1, User2, Assistant2
    assert detail["messages"][0]["role"] == "user"
    assert detail["messages"][1]["role"] == "assistant"
    assert detail["messages"][2]["role"] == "user"
    assert detail["messages"][3]["role"] == "assistant"


@pytest.mark.asyncio
async def test_call_gemini_api_direct_unit():
    """Unit test verifying call_gemini_api handles HTTP response parsing and timeout."""
    mock_gemini_response = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": "Grilled salmon and sweet potato."}]
                }
            }
        ]
    }
    mock_resp = httpx.Response(
        status_code=200,
        json=mock_gemini_response,
        request=httpx.Request("POST", "https://generativelanguage.googleapis.com"),
    )
    context = {
        "pathway": "Athlete Performance",
        "weightKg": 80.0,
        "targetCalories": 2500,
        "targetProtein": 160.0,
        "loggedCalories": 1500,
        "loggedProtein": 100.0,
        "caloriesRemaining": 1000,
        "proteinRemaining": 60.0,
        "recentWorkout": "None",
    }
    with patch.object(settings, "GEMINI_API_KEY", "test-mock-key"):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            result = await AICoachService.call_gemini_api("Suggest food", context)
            assert result is not None
            text_out, insight = result
            assert "Grilled salmon" in text_out
            assert insight.title == "Athlete Performance Live Insight"

            # AUD-P2-06: Verify API key sent in header (not URL) and systemInstruction isolated
            call_args = mock_post.call_args
            called_url = call_args.args[0] if call_args.args else call_args.kwargs.get("url", "")
            assert "?key=" not in called_url
            assert call_args.kwargs["headers"]["x-goog-api-key"] == "test-mock-key"
            assert "systemInstruction" in call_args.kwargs["json"]
            assert call_args.kwargs["json"]["contents"][-1] == {"role": "user", "parts": [{"text": "Suggest food"}]}

        # Verify timeout returns None safely
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = httpx.TimeoutException("Connection timed out")
            timeout_result = await AICoachService.call_gemini_api("Suggest food", context)
            assert timeout_result is None


@pytest.mark.asyncio
async def test_ai_chat_mocked_gemini_success(async_client: AsyncClient):
    """Verifies endpoint handling when external Gemini API succeeds with isMockResponse=False."""
    from app.schemas.chat import CoachStructuredInsight

    user = await create_test_user_and_token(async_client, "gemini_user")
    headers = {"Authorization": f"Bearer {user['tokens']['accessToken']}"}

    mock_insight = CoachStructuredInsight(
        title="Live Insight",
        summary="Target summary",
    )

    with patch.object(AICoachService, "call_gemini_api", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = ("For your Athlete Performance goals, aim for grilled chicken breast.", mock_insight)

        res = await async_client.post(
            "/api/v1/ai/chat",
            json={"message": "Suggest dinner options."},
            headers=headers,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["isMockResponse"] is False  # Live gateway output!
        assert "grilled chicken breast" in data["content"]
        assert data["structuredInsight"] is not None


@pytest.mark.asyncio
async def test_ai_chat_mocked_gemini_timeout_fallback(async_client: AsyncClient):
    """Verifies that an external Gemini timeout gracefully falls back to heuristic engine."""
    user = await create_test_user_and_token(async_client, "timeout_user")
    headers = {"Authorization": f"Bearer {user['tokens']['accessToken']}"}

    with patch.object(AICoachService, "call_gemini_api", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = None  # Gateway returns None on timeout/failure

        res = await async_client.post(
            "/api/v1/ai/chat",
            json={"message": "Recommend high protein snacks."},
            headers=headers,
        )
        assert res.status_code == 200
        data = res.json()
        # Successfully degraded gracefully to heuristic fallback
        assert data["isMockResponse"] is True
        assert len(data["content"]) > 0


@pytest.mark.asyncio
async def test_ai_conversation_cross_user_isolation(async_client: AsyncClient):
    """Verifies that User B cannot view, continue, or delete User A's private conversations."""
    user_a = await create_test_user_and_token(async_client, "client_a")
    user_b = await create_test_user_and_token(async_client, "client_b")

    headers_a = {"Authorization": f"Bearer {user_a['tokens']['accessToken']}"}
    headers_b = {"Authorization": f"Bearer {user_b['tokens']['accessToken']}"}

    # User A starts conversation
    res = await async_client.post(
        "/api/v1/ai/chat",
        json={"message": "Confidential fitness question."},
        headers=headers_a,
    )
    conv_id = res.json()["conversationId"]

    # User B attempts GET -> 403 Forbidden!
    get_b = await async_client.get(f"/api/v1/ai/conversations/{conv_id}", headers=headers_b)
    assert get_b.status_code == 403
    assert get_b.json()["error"]["code"] == "FORBIDDEN"

    # User B attempts to append turn to User A's conversation -> 403 Forbidden!
    post_b = await async_client.post(
        "/api/v1/ai/chat",
        json={"message": "Sneaky message", "conversationId": conv_id},
        headers=headers_b,
    )
    assert post_b.status_code == 403

    # User B attempts DELETE -> 403 Forbidden!
    del_b = await async_client.delete(f"/api/v1/ai/conversations/{conv_id}", headers=headers_b)
    assert del_b.status_code == 403

    # User A lists conversations -> sees 1
    list_a = await async_client.get("/api/v1/ai/conversations", headers=headers_a)
    assert list_a.status_code == 200
    assert len(list_a.json()) >= 1

    # User A deletes conversation -> 204 No Content
    del_a = await async_client.delete(f"/api/v1/ai/conversations/{conv_id}", headers=headers_a)
    assert del_a.status_code == 204
