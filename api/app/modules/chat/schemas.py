"""Chat space, membership, and message schemas."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, computed_field


class ChatSpaceBase(BaseModel):
    """Base chat space fields."""

    name: Annotated[str, Field(min_length=1, max_length=120)]
    description: Annotated[str, Field(max_length=500)] = ""
    kind: Literal["community", "group"]
    visibility: Literal["public", "private"]


class ChatSpaceCreate(ChatSpaceBase):
    """Request to create a chat space."""

    avatar_key: str | None = None


class ChatSpaceUpdate(BaseModel):
    """Request to update a chat space."""

    name: Annotated[str | None, Field(min_length=1, max_length=120)] = None
    description: Annotated[str | None, Field(max_length=500)] = None
    visibility: Literal["public", "private"] | None = None
    avatar_key: str | None = None


class ChatSpaceResponse(ChatSpaceBase):
    """Chat space response."""

    id: UUID
    creator_id: UUID | None
    avatar_key: str | None
    member_count: int
    is_system: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @computed_field  # type: ignore[prop-decorator]
    @property
    def cover(self) -> str | None:
        """Alias for avatar_key to match frontend expectation."""
        return self.avatar_key


class ChatSpaceMemberResponse(BaseModel):
    """Chat space member response."""

    id: UUID
    space_id: UUID
    user_id: UUID
    role: Literal["owner", "admin", "moderator", "member"]
    state: Literal["active", "invited", "left", "removed"]
    invited_by: UUID | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatSpaceMemberCreate(BaseModel):
    """Request to join or add a member to a space."""

    user_id: UUID
    role: Literal["admin", "moderator", "member"] = "member"


class ChatMessageBase(BaseModel):
    """Base chat message fields."""

    body: Annotated[str, Field(min_length=1, max_length=4000)]
    attachments: list[str] | None = None


class ChatMessageCreate(ChatMessageBase):
    """Request to send a message."""

    client_id: UUID | None = None


class ChatMessageResponse(ChatMessageBase):
    """Chat message response."""

    id: UUID
    space_id: UUID
    user_id: UUID
    role: Literal["user", "system"]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatSpaceListResponse(BaseModel):
    """Paginated chat space list."""

    spaces: list[ChatSpaceResponse]
    next_cursor: UUID | None


class ChatMessageListResponse(BaseModel):
    """Paginated chat message list."""

    messages: list[ChatMessageResponse]
    next_cursor: UUID | None


class MyMembershipResponse(BaseModel):
    """Current user's membership in a space."""

    space_id: UUID
    role: Literal["owner", "admin", "moderator", "member"]
    state: Literal["active", "invited", "left", "removed"]
    joined_at: datetime
