"""Assistant thread and message schemas."""

from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class QuestionRequest(BaseModel):
    """Request to answer a farming or beekeeping question."""

    text: str
    farm_id: UUID | None = None
    unit_id: UUID | None = None
    image_keys: list[str] | None = None
    thread_id: UUID | None = None


class AnswerResult(BaseModel):
    """Structured result from question answering."""

    task: Literal["question_answering"]
    status: Literal["answered", "needs_clarification", "refused", "unavailable"]
    answer: str
    confidence: Literal["low", "medium", "high"]
    context_used: Annotated[
        list[
            Literal[
                "farm_profile",
                "location",
                "weather",
                "conversation",
                "records",
                "scans",
                "scheduled_tasks",
            ]
        ],
        Field(max_length=7),
    ]
    weather_summary: str | None
    next_steps: list[str]
    warnings: list[str]
    follow_up_questions: Annotated[list[str], Field(max_length=3)]
    refusal: dict[str, str] | None


class ThreadCreate(BaseModel):
    """Create a new assistant thread."""

    farm_id: UUID | None = None
    unit_id: UUID | None = None


class ThreadResponse(BaseModel):
    """Thread response."""

    id: UUID
    user_id: UUID
    farm_id: UUID | None
    unit_id: UUID | None
    created_at: datetime


class MessageCreate(BaseModel):
    """Create a new message in a thread."""

    text: str
    image_keys: list[str] | None = None


class MessageResponse(BaseModel):
    """Message response."""

    id: UUID
    thread_id: UUID
    role: Literal["user", "assistant"]
    body: str
    attachments: list[str] | None
    safety: dict[str, Any] | None
    feedback: Literal["up", "down"] | None
    created_at: datetime
