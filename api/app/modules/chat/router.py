"""Chat router."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.service import get_current_user_id
from app.modules.chat.schemas import (
    ChatMessageCreate,
    ChatMessageListResponse,
    ChatMessageResponse,
    ChatSpaceCreate,
    ChatSpaceListResponse,
    ChatSpaceMemberCreate,
    ChatSpaceMemberResponse,
    ChatSpaceResponse,
    ChatSpaceUpdate,
    MyMembershipResponse,
)
from app.modules.chat.service import ChatService, ensure_system_spaces

router = APIRouter(prefix="/chat", tags=["chat"])
service = ChatService()


@router.on_event("startup")
async def startup() -> None:
    """Ensure system spaces exist on startup."""
    from app.db.session import async_session_factory

    async with async_session_factory() as db:
        await ensure_system_spaces(db)


@router.post("/spaces", response_model=ChatSpaceResponse, status_code=status.HTTP_201_CREATED)
async def create_space(
    data: ChatSpaceCreate,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> ChatSpaceResponse:
    """Create a new chat space."""
    return await service.create_space(db, user_id, data)


@router.get("/spaces", response_model=ChatSpaceListResponse)
async def list_spaces(
    cursor: UUID | None = None,
    limit: int = Query(50, ge=1, le=100),
    kind: str | None = Query(None, pattern="^(community|group)$"),
    visibility: str | None = Query(None, pattern="^(public|private)$"),
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> ChatSpaceListResponse:
    """List chat spaces with optional filters."""
    spaces, next_cursor = await service.list_spaces(db, cursor, limit, kind, visibility)
    return ChatSpaceListResponse(spaces=spaces, next_cursor=next_cursor)


@router.get("/spaces/public", response_model=ChatSpaceListResponse)
async def list_public_communities(
    cursor: UUID | None = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> ChatSpaceListResponse:
    """List public community spaces (the two system communities)."""
    spaces, next_cursor = await service.list_public_communities(db, cursor, limit)
    return ChatSpaceListResponse(spaces=spaces, next_cursor=next_cursor)


@router.get("/spaces/{space_id}", response_model=ChatSpaceResponse)
async def get_space(
    space_id: UUID,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> ChatSpaceResponse:
    """Get a chat space by ID."""
    space = await service.get_space(db, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


@router.patch("/spaces/{space_id}", response_model=ChatSpaceResponse)
async def update_space(
    space_id: UUID,
    data: ChatSpaceUpdate,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> ChatSpaceResponse:
    """Update a chat space (owner/admin only)."""
    space = await service.update_space(db, space_id, user_id, data)
    if not space:
        raise HTTPException(status_code=403, detail="Not authorized or space not found")
    return space


@router.get("/spaces/{space_id}/me", response_model=MyMembershipResponse | None)
async def get_my_membership(
    space_id: UUID,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> MyMembershipResponse | None:
    """Get current user's membership in a space."""
    return await service.get_my_membership(db, space_id, user_id)


@router.post("/spaces/{space_id}/join", response_model=ChatSpaceMemberResponse)
async def join_space(
    space_id: UUID,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> ChatSpaceMemberResponse:
    """Join a public space."""
    membership = await service.join_space(db, space_id, user_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Space not found or not public")
    return membership


@router.post("/spaces/{space_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_space(
    space_id: UUID,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> None:
    """Leave a space."""
    success = await service.leave_space(db, space_id, user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot leave (not a member or owner)")


@router.post("/spaces/{space_id}/members", response_model=ChatSpaceMemberResponse)
async def add_member(
    space_id: UUID,
    data: ChatSpaceMemberCreate,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> ChatSpaceMemberResponse:
    """Add a member to a space (admin/moderator only)."""
    membership = await service.add_member(db, space_id, user_id, data)
    if not membership:
        raise HTTPException(status_code=403, detail="Not authorized or user not found")
    return membership


@router.delete(
    "/spaces/{space_id}/members/{target_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(
    space_id: UUID,
    target_user_id: UUID,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> None:
    """Remove a member from a space (admin/moderator only)."""
    success = await service.remove_member(db, space_id, user_id, target_user_id)
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized or cannot remove this member")


@router.get("/spaces/{space_id}/members", response_model=ChatSpaceListResponse)
async def list_members(
    space_id: UUID,
    cursor: UUID | None = None,
    limit: int = Query(50, ge=1, le=100),
    state: str = Query("active", pattern="^(active|invited|left|removed)$"),
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> ChatSpaceListResponse:
    """List members of a space (members only)."""
    members, next_cursor = await service.list_members(db, space_id, user_id, cursor, limit, state)
    return ChatSpaceListResponse(spaces=members, next_cursor=next_cursor)  # Reusing list response


@router.post(
    "/spaces/{space_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    space_id: UUID,
    data: ChatMessageCreate,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> ChatMessageResponse:
    """Send a message to a space."""
    message = await service.send_message(db, space_id, user_id, data)
    if not message:
        raise HTTPException(status_code=403, detail="Not a member of this space")
    return message


@router.get("/spaces/{space_id}/messages", response_model=ChatMessageListResponse)
async def list_messages(
    space_id: UUID,
    cursor: UUID | None = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
) -> ChatMessageListResponse:
    """List messages in a space (newest first)."""
    messages, next_cursor = await service.list_messages(db, space_id, user_id, cursor, limit)
    return ChatMessageListResponse(messages=messages, next_cursor=next_cursor)