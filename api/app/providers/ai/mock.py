"""Mock AI provider for testing and local development."""

from collections.abc import AsyncIterator

from app.modules.assistant.schemas import AnswerResult, QuestionRequest
from app.modules.briefings.schemas import BriefingRequest, BriefingResult
from app.modules.scans.schemas import ScanRequest, ScanResult
from app.providers.ai.base import AIProvider


class MockAIProvider(AIProvider):
    """Mock implementation returning safe fallback responses."""

    async def analyze_scan(self, req: ScanRequest) -> ScanResult:
        """Return a mock scan result."""
        return ScanResult(
            task="scan_analysis",
            status="completed",
            likely_causes=[
                {
                    "name": "Possible leaf damage",
                    "confidence": "medium",
                    "reasoning": "Irregular edges visible on leaves in the photo.",
                }
            ],
            overall_confidence="medium",
            observations=["Leaf edges show missing sections."],
            weather_relevance="Recent humidity may affect the crop.",
            needs_better_photo=False,
            better_photo_hint=None,
            follow_up_questions=["Have you seen insects on the underside of leaves?"],
            next_steps=["Inspect both sides of affected leaves early morning."],
            protective_gear_warning=None,
            pollinator_warning=None,
            label_notice="Check the product label and your local rules before using any chemical.",
            expert_referral=None,
            suggested_record={"title": "Possible leaf damage on crop", "type": "crop_observation"},
            refusal=None,
            disclaimer_version="1",
        )

    async def answer_question(self, req: QuestionRequest) -> AnswerResult:
        """Return a mock answer."""
        return AnswerResult(
            task="question_answering",
            status="answered",
            answer=(
                "Based on your farm details and current weather, "
                "wait for a dry period before inspecting the hives."
            ),
            confidence="high",
            context_used=["farm_profile", "weather"],
            weather_summary="Rain expected this afternoon with winds above 20 km/h.",
            next_steps=[
                (
                    "Inspect on the next dry period when wind is 20 km/h or lower "
                    "and temperature is at least 18°C."
                )
            ],
            warnings=["Wear suitable protective clothing when opening a hive."],
            follow_up_questions=[],
            refusal=None,
        )

    def stream_answer(self, req: QuestionRequest) -> AsyncIterator[str]:
        """Stream a mock answer."""

        async def _stream():
            text = (
                "Based on your farm details and current weather, "
                "wait for a dry period before inspecting the hives."
            )
            # Yield in chunks to simulate streaming
            for i in range(0, len(text), 10):
                yield text[i : i + 10]

        return _stream()

    async def generate_daily_briefing(self, req: BriefingRequest) -> BriefingResult:
        """Return a mock daily briefing."""
        return BriefingResult(
            task="daily_briefing",
            status="ready",
            local_date=req.local_date,
            location_label="Ibadan North, Oyo",
            weather_summary="Warm and humid, with rain likely this afternoon.",
            priorities=[
                {
                    "title": "Check field drainage",
                    "reason": "Rain may be heavy.",
                    "timing": "Before rain",
                    "source_task_id": None,
                }
            ],
            pest_risks=[],
            hive_advice="Wait for a dry, calm period before opening the hives.",
            postponed_tasks=[],
            alerts=[],
            limitations=[],
            refusal=None,
        )
