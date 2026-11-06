from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import ErrorResponse
from app.core.security import AuthenticatedIdentity, require_authenticated_identity
from app.db.session import get_session
from app.modules.auth.service import require_current_user
from app.modules.users import deletion_service, profile_service
from app.modules.users.schemas import (
    DeletionResponse,
    ProfilePatch,
    ProfileResponse,
    UserPatch,
    UserResponse,
)

router = APIRouter(
    tags=["users"],
    responses={
        401: {"model": ErrorResponse, "description": "Sign-in required"},
        403: {"model": ErrorResponse, "description": "Account inactive"},
        404: {"model": ErrorResponse, "description": "Profile not yet created"},
        409: {"model": ErrorResponse, "description": "Account setup required"},
        422: {"model": ErrorResponse, "description": "Invalid profile details"},
        503: {"model": ErrorResponse, "description": "Service temporarily unavailable"},
    },
)
CurrentUser = Annotated[UserResponse, Depends(require_current_user)]
Session = Annotated[AsyncSession, Depends(get_session)]
Config = Annotated[Settings, Depends(get_settings)]


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Validate the session and get the current farmer account",
    responses={
        401: {"model": ErrorResponse, "description": "Missing, invalid or expired session"},
        403: {"model": ErrorResponse, "description": "Account suspended or deleted"},
        409: {"model": ErrorResponse, "description": "Account bootstrap required"},
        503: {"model": ErrorResponse, "description": "Authentication or account store unavailable"},
    },
)
async def me(user: Annotated[UserResponse, Depends(require_current_user)]) -> UserResponse:
    return user


@router.patch("/me", response_model=UserResponse, summary="Update your account preferences")
async def update_me(
    data: UserPatch, user: CurrentUser, session: Session, settings: Config
) -> UserResponse:
    return await profile_service.update_user(session, user.id, data, settings)


@router.get("/me/chat-profile", response_model=ProfileResponse, summary="Read your farmer profile")
async def get_profile(user: CurrentUser, session: Session) -> ProfileResponse:
    return await profile_service.get_profile(session, user.id)


@router.patch(
    "/me/chat-profile", response_model=ProfileResponse, summary="Create or edit your farmer profile"
)
async def update_profile(
    data: ProfilePatch, user: CurrentUser, session: Session
) -> ProfileResponse:
    return await profile_service.update_profile(session, user.id, data)


@router.delete(
    "/me", response_model=DeletionResponse, status_code=202, summary="Request account deletion"
)
async def delete_me(
    identity: Annotated[AuthenticatedIdentity, Depends(require_authenticated_identity)],
    session: Session,
    settings: Config,
) -> DeletionResponse:
    # A valid Supabase identity may delete a suspended account or retry a deleted one.
    return await deletion_service.request_deletion(session, identity.supabase_user_id, settings)
