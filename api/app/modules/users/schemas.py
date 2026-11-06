from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
