from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.errors import ErrorResponse
from app.modules.auth.service import require_current_user
from app.modules.users.schemas import UserResponse

router = APIRouter(tags=["users"])


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
