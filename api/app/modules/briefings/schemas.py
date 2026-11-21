"""Daily briefing schemas."""

from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class BriefingRequest(BaseModel):
    """Request to generate a daily briefing."""

    farm_id: UUID
    local_date: date


class Priority(BaseModel):
    """A priority item in the briefing."""

    title: str
    reason: str
    timing: str
    source_task_id: str | None


class PestRisk(BaseModel):
    """A pest risk indicator in the briefing."""

    name: str
    level: Literal["low", "medium", "high"]
    reason: str
    action: str


class PostponedTask(BaseModel):
    """A postponed task in the briefing."""

    task_id: str
    reason: str
    safer_window: str | None


class BriefingResult(BaseModel):
    """Structured result from daily briefing generation."""

    task: Literal["daily_briefing"]
    status: Literal["ready", "limited", "unavailable"]
    local_date: date
    location_label: str | None
    weather_summary: str | None
    priorities: Annotated[list[Priority], Field(max_length=5)]
    pest_risks: list[PestRisk]
    hive_advice: str | None
    postponed_tasks: list[PostponedTask]
    alerts: list[str]
    limitations: list[str]
    refusal: dict[str, str] | None


class BriefingResponse(BaseModel):
    """API response for daily briefing."""

    task: Literal["daily_briefing"]
    status: Literal["ready", "limited", "unavailable"]
    local_date: date
    location_label: str
    weather_summary: str | None
    priorities: list[Priority]
    pest_risks: list[PestRisk]
    hive_advice: str | None
    postponed_tasks: list[PostponedTask]
    alerts: list[str]
    limitations: list[str]
    refusal: dict[str, str] | None
    generated_at: datetime
    prompt_version: str
    weather_observed_at: datetime | None
