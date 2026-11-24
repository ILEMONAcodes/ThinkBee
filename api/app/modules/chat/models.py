"""Chat spaces, memberships, and messages."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ARRAY, CheckConstraint, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.ids import uuid7
from app.db.models import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.users.models import User


class ChatSpace(TimestampMixin, Base):
    """A chat space (community or group) that can host thousands of members."""

    __tablename__ = "chat_spaces"
    __table_args__ = (
        CheckConstraint("kind IN ('community', 'group')", name="ck_chat_spaces_kind"),
        CheckConstraint("visibility IN ('public', 'private')", name="ck_chat_spaces_visibility"),
        Index("ix_chat_spaces_kind_visibility", "kind", "visibility"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7)
    creator_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(500), server_default="", nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # community | group
    visibility: Mapped[str] = mapped_column(String(16), nullable=False)  # public | private
    avatar_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    member_count: Mapped[int] = mapped_column(server_default="0", nullable=False)
    is_system: Mapped[bool] = mapped_column(server_default="false", nullable=False)

    # Relationships
    creator: Mapped[User | None] = relationship(
        foreign_keys=[creator_id], back_populates="created_chat_spaces"
    )
    memberships: Mapped[list[ChatSpaceMember]] = relationship(
        back_populates="space", cascade="all, delete-orphan"
    )
    messages: Mapped[list[ChatMessage]] = relationship(
        back_populates="space", cascade="all, delete-orphan"
    )


class ChatSpaceMember(TimestampMixin, Base):
    """Membership linking a user to a chat space."""

    __tablename__ = "chat_space_members"
    __table_args__ = (
        CheckConstraint(
            "role IN ('owner', 'admin', 'moderator', 'member')",
            name="ck_chat_space_members_role",
        ),
        CheckConstraint(
            "state IN ('active', 'invited', 'left', 'removed')",
            name="ck_chat_space_members_state",
        ),
        Index("ix_chat_space_members_space_user", "space_id", "user_id", unique=True),
        Index("ix_chat_space_members_space_state", "space_id", "state"),
        Index("ix_chat_space_members_user_state", "user_id", "state"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7)
    space_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(16), server_default="member", nullable=False)
    state: Mapped[str] = mapped_column(String(16), server_default="active", nullable=False)
    invited_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    space: Mapped[ChatSpace] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship(
        foreign_keys=[user_id], back_populates="chat_space_memberships"
    )
    inviter: Mapped[User | None] = relationship(foreign_keys=[invited_by])


class ChatMessage(TimestampMixin, Base):
    """A message in a chat space."""

    __tablename__ = "chat_messages"
    __table_args__ = (
        CheckConstraint("role IN ('user', 'system')", name="ck_chat_messages_role"),
        Index("ix_chat_messages_space_created", "space_id", "created_at"),
        Index("ix_chat_messages_space_user", "space_id", "user_id"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid7)
    space_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(16), server_default="user", nullable=False)
    body: Mapped[str] = mapped_column(String(4000), nullable=False)
    attachments: Mapped[list[str] | None] = mapped_column(ARRAY(String()), nullable=True)

    # Relationships
    space: Mapped[ChatSpace] = relationship(back_populates="messages")
    user: Mapped[User] = relationship(back_populates="chat_messages")
