"""Scan request and result schemas."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ScanPhotoResponse(BaseModel):
    key: str


class ScanRequest(BaseModel):
    """Request to analyze a crop or hive photo/video."""

    subject: Literal["hive", "crop"]
    subject_type: Annotated[str | None, Field(max_length=64)] = None
    farm_id: UUID | None = None
    unit_id: UUID | None = None
    image_keys: Annotated[list[str], Field(min_length=1, max_length=5)]
    note: Annotated[str | None, Field(max_length=4000)] = None
    client_id: UUID


class LikelyCause(BaseModel):
    """A likely cause with confidence and reasoning."""

    name: str
    confidence: Literal["low", "medium", "high"]
    reasoning: str


class ScanResult(BaseModel):
    """Structured result from scan analysis."""

    task: Literal["scan_analysis"]
    status: Literal["completed", "needs_clarification", "refused", "unavailable"]
    likely_causes: Annotated[list[LikelyCause], Field(max_length=3)]
    overall_confidence: Literal["low", "medium", "high"]
    observations: list[str]
    weather_relevance: str | None
    needs_better_photo: bool
    better_photo_hint: str | None
    follow_up_questions: Annotated[list[str], Field(max_length=3)]
    next_steps: list[str]
    protective_gear_warning: str | None
    pollinator_warning: str | None
    label_notice: str
    expert_referral: str | None
    suggested_record: dict[str, str] | None
    refusal: dict[str, str] | None
    disclaimer_version: str


class ScanResponse(BaseModel):
    """API response for scan creation."""

    id: UUID
    status: Literal["queued", "analysing", "done", "failed"]


class ScanDetail(BaseModel):
    """Full scan detail including result when done."""

    id: UUID
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    farm_id: UUID | None
    unit_id: UUID | None
    subject: Literal["hive", "crop"]
    subject_type: str | None = None
    status: Literal["queued", "analysing", "done", "failed"]
    result: ScanResult | None
    prompt_version: str
    model: str
    created_at: datetime
