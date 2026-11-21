"""Chat space, membership, and message service."""

import logging
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.chat.models import ChatMessage, ChatSpace, ChatSpaceMember
from app.modules.chat.schemas import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSpaceCreate,
    ChatSpaceMemberCreate,
    ChatSpaceMemberResponse,
    ChatSpaceResponse,
    ChatSpaceUpdate,
    MyMembershipResponse,
)
from app.modules.users.models import User

logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100


class ChatService:
    """Service for handling chat spaces, memberships, and messages."""

    async def create_space(
        self,
        db: AsyncSession,
        creator_id: UUID,
        data: ChatSpaceCreate,
    ) -> ChatSpaceResponse:
        """Create a new chat space."""
        space = ChatSpace(
            creator_id=creator_id,
            name=data.name,
            description=data.description,
            kind=data.kind,
            visibility=data.visibility,
            avatar_key=data.avatar_key,
        )
        db.add(space)
        await db.flush()

        # Add creator as owner
        membership = ChatSpaceMember(
            space_id=space.id,
            user_id=creator_id,
            role="owner",
            state="active",
        )
        db.add(membership)
        space.member_count = 1

        await db.flush()
        await db.refresh(space, ["creator", "memberships"])
        return ChatSpaceResponse.model_validate(space)

    async def get_space(
        self,
        db: AsyncSession,
        space_id: UUID,
    ) -> ChatSpaceResponse | None:
        """Get a chat space by ID."""
        result = await db.execute(
            select(ChatSpace)
            .options(selectinload(ChatSpace.creator))
            .where(ChatSpace.id == space_id)
        )
        space = result.scalar_one_or_none()
        if space:
            return ChatSpaceResponse.model_validate(space)
        return None

    async def update_space(
        self,
        db: AsyncSession,
        space_id: UUID,
        user_id: UUID,
        data: ChatSpaceUpdate,
    ) -> ChatSpaceResponse | None:
        """Update a chat space (owner/admin only)."""
        # Check membership
        membership = await self._get_membership(db, space_id, user_id)
        if not membership or membership.role not in (
            "owner",
            "admin",
        ) or membership.state != "active":
            return None

        result = await db.execute(select(ChatSpace).where(ChatSpace.id == space_id))
        space = result.scalar_one_or_none()
        if not space:
            return None

        if data.name is not None:
            space.name = data.name
        if data.description is not None:
            space.description = data.description
        if data.visibility is not None:
            space.visibility = data.visibility
        if data.avatar_key is not None:
            space.avatar_key = data.avatar_key

        await db.flush()
        await db.refresh(space, ["creator"])
        return ChatSpaceResponse.model_validate(space)

    async def list_spaces(
        self,
        db: AsyncSession,
        cursor: UUID | None = None,
        limit: int = DEFAULT_PAGE_SIZE,
        kind: str | None = None,
        visibility: str | None = None,
    ) -> tuple[list[ChatSpaceResponse], UUID | None]:
        """List chat spaces with optional filters."""
        query = select(ChatSpace).options(selectinload(ChatSpace.creator)).order_by(ChatSpace.id)

        if kind:
            query = query.where(ChatSpace.kind == kind)
        if visibility:
            query = query.where(ChatSpace.visibility == visibility)
        if cursor:
            query = query.where(ChatSpace.id > cursor)

        query = query.limit(limit + 1)
        result = await db.execute(query)
        spaces = list(result.scalars().all())

        next_cursor = None
        if len(spaces) > limit:
            spaces = spaces[:limit]
            next_cursor = spaces[-1].id

        return [ChatSpaceResponse.model_validate(s) for s in spaces], next_cursor

    async def list_public_communities(
        self,
        db: AsyncSession,
        cursor: UUID | None = None,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> tuple[list[ChatSpaceResponse], UUID | None]:
        """List public community spaces."""
        return await self.list_spaces(db, cursor, limit, kind="community", visibility="public")

    async def get_my_membership(
        self,
        db: AsyncSession,
        space_id: UUID,
        user_id: UUID,
    ) -> MyMembershipResponse | None:
        """Get current user's membership in a space."""
        membership = await self._get_membership(db, space_id, user_id)
        if not membership:
            return None
        return MyMembershipResponse(
            space_id=membership.space_id,
            role=membership.role,
            state=membership.state,
            joined_at=membership.created_at,
        )

    async def join_space(
        self,
        db: AsyncSession,
        space_id: UUID,
        user_id: UUID,
    ) -> ChatSpaceMemberResponse | None:
        """Join a public space or accept an invitation."""
        # Check if space exists and is public
        result = await db.execute(select(ChatSpace).where(ChatSpace.id == space_id))
        space = result.scalar_one_or_none()
        if not space or space.visibility != "public":
            return None

        # Check existing membership
        existing = await self._get_membership(db, space_id, user_id)
        if existing:
            if existing.state == "active":
                return ChatSpaceMemberResponse.model_validate(existing)
            # Reactivate if left/removed
            existing.state = "active"
            existing.role = "member"
            space.member_count += 1
            await db.flush()
            return ChatSpaceMemberResponse.model_validate(existing)

        # Create new membership
        membership = ChatSpaceMember(
            space_id=space_id,
            user_id=user_id,
            role="member",
            state="active",
        )
        db.add(membership)
        space.member_count += 1
        await db.flush()
        return ChatSpaceMemberResponse.model_validate(membership)

    async def leave_space(
        self,
        db: AsyncSession,
        space_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Leave a space."""
        membership = await self._get_membership(db, space_id, user_id)
        if not membership or membership.state != "active":
            return False

        # Cannot leave if owner (must transfer ownership first)
        if membership.role == "owner":
            return False

        membership.state = "left"
        result = await db.execute(select(ChatSpace).where(ChatSpace.id == space_id))
        space = result.scalar_one_or_none()
        if space:
            space.member_count = max(0, space.member_count - 1)
        await db.flush()
        return True

    async def add_member(
        self,
        db: AsyncSession,
        space_id: UUID,
        actor_id: UUID,
        data: ChatSpaceMemberCreate,
    ) -> ChatSpaceMemberResponse | None:
        """Add a member to a space (admin/moderator only)."""
        membership = await self._get_membership(db, space_id, actor_id)
        if not membership or membership.role not in (
            "owner",
            "admin",
            "moderator",
        ) or membership.state != "active":
            return None

        # Check target user exists
        result = await db.execute(select(User).where(User.id == data.user_id))
        target_user = result.scalar_one_or_none()
        if not target_user:
            return None

        # Check existing membership
        existing = await self._get_membership(db, space_id, data.user_id)
        if existing:
            if existing.state == "active":
                return ChatSpaceMemberResponse.model_validate(existing)
            existing.state = "active"
            existing.role = data.role
            existing.invited_by = actor_id
            space_result = await db.execute(select(ChatSpace).where(ChatSpace.id == space_id))
            space: ChatSpace | None = space_result.scalars().one_or_none()
            if space:
                space.member_count += 1
            await db.flush()
            return ChatSpaceMemberResponse.model_validate(existing)

        membership = ChatSpaceMember(
            space_id=space_id,
            user_id=data.user_id,
            role=data.role,
            state="active",
            invited_by=actor_id,
        )
        db.add(membership)
        space_result = await db.execute(select(ChatSpace).where(ChatSpace.id == space_id))
        space = space_result.scalars().one_or_none()
        if space:
            space.member_count += 1
        await db.flush()
        return ChatSpaceMemberResponse.model_validate(membership)

    async def remove_member(
        self,
        db: AsyncSession,
        space_id: UUID,
        actor_id: UUID,
        target_user_id: UUID,
    ) -> bool:
        """Remove a member from a space (admin/moderator only, cannot remove owner)."""
        actor_membership = await self._get_membership(db, space_id, actor_id)
        if not actor_membership or actor_membership.role not in (
            "owner",
            "admin",
        ) or actor_membership.state != "active":
            return False

        target_membership = await self._get_membership(db, space_id, target_user_id)
        if not target_membership or target_membership.state != "active":
            return False

        # Cannot remove owner
        if target_membership.role == "owner":
            return False

        # Cannot remove yourself via this method (use leave_space)
        if actor_id == target_user_id:
            return False

        # Moderators can only remove members
        if actor_membership.role == "moderator" and target_membership.role != "member":
            return False

        target_membership.state = "removed"
        result = await db.execute(select(ChatSpace).where(ChatSpace.id == space_id))
        space = result.scalar_one_or_none()
        if space:
            space.member_count = max(0, space.member_count - 1)
        await db.flush()
        return True

    async def list_members(
        self,
        db: AsyncSession,
        space_id: UUID,
        user_id: UUID,
        cursor: UUID | None = None,
        limit: int = DEFAULT_PAGE_SIZE,
        state: str = "active",
    ) -> tuple[list[ChatSpaceMemberResponse], UUID | None]:
        """List members of a space (members only)."""
        membership = await self._get_membership(db, space_id, user_id)
        if not membership or membership.state != "active":
            return [], None

        query = (
            select(ChatSpaceMember)
            .where(ChatSpaceMember.space_id == space_id, ChatSpaceMember.state == state)
            .order_by(ChatSpaceMember.id)
        )
        if cursor:
            query = query.where(ChatSpaceMember.id > cursor)
        query = query.limit(limit + 1)

        result = await db.execute(query)
        members = list(result.scalars().all())

        next_cursor = None
        if len(members) > limit:
            members = members[:limit]
            next_cursor = members[-1].id

        return [ChatSpaceMemberResponse.model_validate(m) for m in members], next_cursor

    async def send_message(
        self,
        db: AsyncSession,
        space_id: UUID,
        user_id: UUID,
        data: ChatMessageCreate,
    ) -> ChatMessageResponse | None:
        """Send a message to a space (active members only)."""
        membership = await self._get_membership(db, space_id, user_id)
        if not membership or membership.state != "active":
            return None

        message = ChatMessage(
            space_id=space_id,
            user_id=user_id,
            role="user",
            body=data.body,
            attachments=data.attachments,
        )
        db.add(message)
        await db.flush()
        await db.refresh(message)
        return ChatMessageResponse.model_validate(message)

    async def list_messages(
        self,
        db: AsyncSession,
        space_id: UUID,
        user_id: UUID,
        cursor: UUID | None = None,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> tuple[list[ChatMessageResponse], UUID | None]:
        """List messages in a space (active members only, newest first)."""
        membership = await self._get_membership(db, space_id, user_id)
        if not membership or membership.state != "active":
            return [], None

        query = (
            select(ChatMessage)
            .where(ChatMessage.space_id == space_id)
            .order_by(desc(ChatMessage.id))
        )
        if cursor:
            query = query.where(ChatMessage.id < cursor)
        query = query.limit(limit + 1)

        result = await db.execute(query)
        messages = list(result.scalars().all())

        next_cursor = None
        if len(messages) > limit:
            messages = messages[:limit]
            next_cursor = messages[-1].id

        return [ChatMessageResponse.model_validate(m) for m in messages], next_cursor

    async def _get_membership(
        self,
        db: AsyncSession,
        space_id: UUID,
        user_id: UUID,
    ) -> ChatSpaceMember | None:
        """Get membership by space and user."""
        result = await db.execute(
            select(ChatSpaceMember).where(
                ChatSpaceMember.space_id == space_id,
                ChatSpaceMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()


async def ensure_system_spaces(db: AsyncSession) -> None:
    """Ensure the two system communities exist."""
    # Check if system spaces already exist
    result = await db.execute(
        select(ChatSpace).where(ChatSpace.is_system == True)  # noqa: E712
    )
    existing = list(result.scalars().all())
    existing_names = {s.name for s in existing}

    # Beekeepers community
    if "Beekeepers" not in existing_names:
        beekeepers = ChatSpace(
            creator_id=UUID("00000000-0000-0000-0000-000000000000"),
            name="Beekeepers",
            description=(
                "A community for beekeepers to share knowledge, "
                "ask questions, and connect."
            ),
            kind="community",
            visibility="public",
            is_system=True,
        )
        db.add(beekeepers)
        await db.flush()

    # General Farmers community
    if "General Farmers" not in existing_names:
        farmers = ChatSpace(
            creator_id=UUID("00000000-0000-0000-0000-000000000000"),
            name="General Farmers",
            description=(
                "A community for crop farmers to share knowledge, "
                "ask questions, and connect."
            ),
            kind="community",
            visibility="public",
            is_system=True,
        )
        db.add(farmers)
        await db.flush()

    # Add memberships for system user if needed
    for _space in [s for s in [beekeepers, farmers] if 'beekeepers' in locals() and s is not None]:
        pass  # memberships added on user join