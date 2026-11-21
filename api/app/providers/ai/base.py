"""AI Provider interface for Think Bee."""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any

from app.modules.assistant.schemas import AnswerResult, QuestionRequest
from app.modules.briefings.schemas import BriefingRequest, BriefingResult
from app.modules.scans.schemas import ScanRequest, ScanResult


class AIProvider(ABC):
    """Abstract base class for AI providers."""

    @abstractmethod
    async def analyze_scan(self, req: ScanRequest) -> ScanResult:
        """Analyze a crop or hive photo."""
        ...

    @abstractmethod
    async def answer_question(self, req: QuestionRequest) -> AnswerResult:
        """Answer a farming or beekeeping question."""
        ...

    @abstractmethod
    def stream_answer(self, req: QuestionRequest) -> AsyncIterator[str]:
        """Stream an answer for a question (SSE)."""
        ...

    @abstractmethod
    async def generate_daily_briefing(self, req: BriefingRequest) -> BriefingResult:
        """Generate a daily briefing for a farm."""
        ...

    def _build_context_from_scan_request(self, req: ScanRequest) -> dict[str, Any]:
        """Build context dict from scan request."""
        return {
            "context_version": "1",
            "request": {
                "request_id": str(req.client_id),
                "task": "scan_analysis",
                "requested_at": "",
                "locale": "en-NG",
            },
            "farm": {},
            "location": {},
            "weather": {},
            "history": {},
            "availability": {},
        }

    def _build_context_from_question_request(self, req: QuestionRequest) -> dict[str, Any]:
        """Build context dict from question request."""
        return {
            "context_version": "1",
            "request": {
                "request_id": str(req.thread_id) if req.thread_id else "new",
                "task": "question_answering",
                "requested_at": "",
                "locale": "en-NG",
            },
            "farm": {},
            "location": {},
            "weather": {},
            "history": {},
            "availability": {},
        }

    def _build_context_from_briefing_request(self, req: BriefingRequest) -> dict[str, Any]:
        """Build context dict from briefing request."""
        return {
            "context_version": "1",
            "request": {
                "request_id": str(req.farm_id),
                "task": "daily_briefing",
                "requested_at": "",
                "locale": "en-NG",
            },
            "farm": {},
            "location": {},
            "weather": {},
            "history": {},
            "availability": {},
        }
