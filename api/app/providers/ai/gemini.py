"""Gemini AI provider implementation."""

import json
import logging
from collections.abc import AsyncIterator
from pathlib import Path

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.modules.assistant.schemas import AnswerResult, QuestionRequest
from app.modules.briefings.schemas import BriefingRequest, BriefingResult
from app.modules.scans.schemas import ScanRequest, ScanResult
from app.providers.ai.base import AIProvider

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).resolve().parents[3] / "prompts"
SYSTEM_PROMPT_PATH = PROMPTS_DIR / "ai_system_prompt.md"
SCAN_PROMPT_PATH = PROMPTS_DIR / "scan_analysis_prompt.md"
QUESTION_PROMPT_PATH = PROMPTS_DIR / "question_answering_prompt.md"
CLARIFICATION_PROMPT_PATH = PROMPTS_DIR / "clarification_prompt.md"
BRIEFING_PROMPT_PATH = PROMPTS_DIR / "daily_briefing_prompt.md"


class GeminiProvider(AIProvider):
    """Gemini implementation of the AI provider interface."""

    def __init__(self) -> None:
        s = get_settings()
        if not s.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not configured")
        self.client = genai.Client(api_key=s.gemini_api_key)
        self.model = s.gemini_model or "gemini-1.5-flash"
        self._system_prompt = self._load_prompt(SYSTEM_PROMPT_PATH)
        self._scan_prompt = self._load_prompt(SCAN_PROMPT_PATH)
        self._question_prompt = self._load_prompt(QUESTION_PROMPT_PATH)
        self._clarification_prompt = self._load_prompt(CLARIFICATION_PROMPT_PATH)
        self._briefing_prompt = self._load_prompt(BRIEFING_PROMPT_PATH)

    def _load_prompt(self, path: Path) -> str:
        """Load a prompt file, stripping frontmatter."""
        content = path.read_text(encoding="utf-8")
        # Remove YAML frontmatter if present
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                content = parts[2].strip()
        return content

    def _build_context_text(self, context: dict) -> str:
        """Render context dict as text for the prompt."""
        lines = []
        lines.append(f"CONTEXT VERSION: {context.get('context_version', '1')}")

        req = context.get("request", {})
        lines.append(
            "REQUEST: "
            f"task={req.get('task', '')}; "
            f"requested_at={req.get('requested_at', '')}; "
            f"locale={req.get('locale', '')}"
        )

        farm = context.get("farm", {})
        if farm:
            parts = []
            if farm.get("state"):
                parts.append(f"state={farm['state']}")
            if farm.get("lga"):
                parts.append(f"lga={farm['lga']}")
            if farm.get("crops"):
                parts.append(f"crops={','.join(farm['crops'])}")
            if farm.get("hive_count") is not None:
                hive_str = str(farm["hive_count"])
                if farm.get("hive_types"):
                    hive_str += f" {','.join(farm['hive_types'])}"
                parts.append(f"hives={hive_str}")
            if parts:
                lines.append(f"FARM: {'; '.join(parts)}")

        loc = context.get("location", {})
        if loc:
            parts = []
            if loc.get("source"):
                parts.append(f"source={loc['source']}")
            if loc.get("label"):
                parts.append(f"label={loc['label']}")
            if (
                loc.get("latitude_truncated") is not None
                and loc.get("longitude_truncated") is not None
            ):
                parts.append(
                    f"privacy_cell={loc['latitude_truncated']},{loc['longitude_truncated']}"
                )
            if parts:
                lines.append(f"LOCATION: {'; '.join(parts)}")

        weather = context.get("weather", {})
        if weather:
            parts = []
            if weather.get("status"):
                parts.append(f"status={weather['status']}")
            if weather.get("observed_at"):
                parts.append(f"observed_at={weather['observed_at']}")
            if weather.get("temperature_c") is not None:
                parts.append(f"temp_c={weather['temperature_c']}")
            if weather.get("humidity_percent") is not None:
                parts.append(f"humidity_pct={weather['humidity_percent']}")
            if weather.get("rain_probability_next_4h_percent") is not None:
                parts.append(f"rain_next_4h_pct={weather['rain_probability_next_4h_percent']}")
            if weather.get("wind_speed_kmh") is not None:
                parts.append(f"wind_kmh={weather['wind_speed_kmh']}")
            if weather.get("wind_direction"):
                parts.append(f"wind_direction={weather['wind_direction']}")
            if parts:
                lines.append(f"WEATHER: {'; '.join(parts)}")

        hist = context.get("history", {})
        hist_parts = []
        if hist.get("conversation_messages"):
            hist_parts.append(f"conversation={len(hist['conversation_messages'])}")
        if hist.get("recent_records"):
            hist_parts.append(f"recent_records={len(hist['recent_records'])}")
        if hist.get("recent_scans"):
            hist_parts.append(f"recent_scans={len(hist['recent_scans'])}")
        if hist.get("scheduled_tasks"):
            hist_parts.append(f"scheduled_tasks={len(hist['scheduled_tasks'])}")
        if hist_parts:
            lines.append(f"HISTORY: {'; '.join(hist_parts)}")

        avail = context.get("availability", {})
        avail_parts = [f"{k}={v}" for k, v in avail.items() if v]
        if avail_parts:
            lines.append(f"AVAILABILITY: {'; '.join(avail_parts)}")

        return "\n".join(lines)

    async def analyze_scan(self, req: ScanRequest) -> ScanResult:
        """Analyze a crop or hive photo."""
        # Build context from request
        context = self._build_context_from_scan_request(req)
        context_text = self._build_context_text(context)

        # Prepare content parts
        contents = [
            self._system_prompt,
            self._scan_prompt,
            context_text,
            f"FARMER NOTE: {req.note or 'None'}",
        ]

        # Add images
        image_parts = []
        for key in req.image_keys:
            image_parts.append(
                types.Part.from_uri(
                    file_uri=f"s3://{get_settings().S3_BUCKET}/{key}", mime_type="image/jpeg"
                )
            )

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=contents + image_parts,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ScanResult.model_json_schema(),
                temperature=0.2,
            ),
        )

        # Parse and validate
        try:
            result_data = json.loads(response.text)
            return ScanResult.model_validate(result_data)
        except Exception as e:
            logger.error(f"Failed to parse scan analysis: {e}")
            raise

    async def answer_question(self, req: QuestionRequest) -> AnswerResult:
        """Answer a farming or beekeeping question."""
        context = self._build_context_from_question_request(req)
        context_text = self._build_context_text(context)

        contents = [
            self._system_prompt,
            self._question_prompt,
            context_text,
            f"QUESTION: {req.text}",
        ]

        image_parts = []
        if req.image_keys:
            for key in req.image_keys:
                image_parts.append(
                    types.Part.from_uri(
                        file_uri=f"s3://{get_settings().S3_BUCKET}/{key}", mime_type="image/jpeg"
                    )
                )

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=contents + image_parts,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AnswerResult.model_json_schema(),
                temperature=0.3,
            ),
        )

        try:
            result_data = json.loads(response.text)
            return AnswerResult.model_validate(result_data)
        except Exception as e:
            logger.error(f"Failed to parse question answer: {e}")
            raise

    def stream_answer(self, req: QuestionRequest) -> AsyncIterator[str]:
        """Stream an answer for a question (SSE)."""
        context = self._build_context_from_question_request(req)
        context_text = self._build_context_text(context)

        contents = [
            self._system_prompt,
            self._question_prompt,
            context_text,
            f"QUESTION: {req.text}",
        ]

        image_parts = []
        if req.image_keys:
            for key in req.image_keys:
                image_parts.append(
                    types.Part.from_uri(
                        file_uri=f"s3://{get_settings().S3_BUCKET}/{key}", mime_type="image/jpeg"
                    )
                )

        async def _stream():
            async for chunk in self.client.aio.models.generate_content_stream(
                model=self.model,
                contents=contents + image_parts,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                ),
            ):
                if chunk.text:
                    yield chunk.text

        return _stream()

    async def generate_daily_briefing(self, req: BriefingRequest) -> BriefingResult:
        """Generate a daily briefing for a farm."""
        context = self._build_context_from_briefing_request(req)
        context_text = self._build_context_text(context)

        contents = [
            self._system_prompt,
            self._briefing_prompt,
            context_text,
        ]

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=BriefingResult.model_json_schema(),
                temperature=0.2,
            ),
        )

        try:
            result_data = json.loads(response.text)
            return BriefingResult.model_validate(result_data)
        except Exception as e:
            logger.error(f"Failed to parse daily briefing: {e}")
            raise
