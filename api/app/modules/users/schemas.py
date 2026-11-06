from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.schemas import InputModel, PatchModel


class UserResponse(BaseModel):
    """Private account summary; never includes Supabase claims or credentials."""

    model_config = ConfigDict(from_attributes=True, frozen=True)

    id: UUID
    farmer_id: str = Field(pattern=r"^TB-[0-9A-HJKMNP-TV-Z]{8}$")
    status: Literal["active", "suspended", "deleted"]
    is_think_bee_admin: bool
    locale: str
    last_seen_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserPatch(InputModel):
    locale: str = Field(min_length=2, max_length=16)


class ProfilePatch(PatchModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=280)
    area_state: str | None = Field(default=None, min_length=1, max_length=80)
    area_lga: str | None = Field(default=None, min_length=1, max_length=100)
    show_crops: bool | None = None
    show_hive_type: bool | None = None

    @field_validator("display_name", "bio", "show_crops", "show_hive_type")
    @classmethod
    def reject_null(cls, value: str | bool | None) -> str | bool:
        if value is None:
            raise ValueError("This field cannot be empty.")
        return value


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    display_name: str
    photo_key: str | None
    bio: str
    area_state: str | None
    area_lga: str | None
    show_crops: bool
    show_hive_type: bool
    created_at: datetime
    updated_at: datetime


class DeletionResponse(BaseModel):
    status: Literal["pending", "completed"]
    requested_at: datetime
    completed_at: datetime | None
