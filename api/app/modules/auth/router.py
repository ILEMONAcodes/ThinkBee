from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import ErrorResponse
from app.core.security import AuthenticatedIdentity, require_authenticated_identity
from app.db.session import get_session
from app.modules.auth.schemas import BootstrapResponse
from app.modules.auth.service import bootstrap_account

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/bootstrap",
    response_model=BootstrapResponse,
    summary="Create or retrieve the farmer account for a Supabase session",
    responses={
        401: {"model": ErrorResponse, "description": "Missing, invalid or expired session"},
        403: {"model": ErrorResponse, "description": "Account suspended or deleted"},
        503: {"model": ErrorResponse, "description": "Authentication or account store unavailable"},
    },
)
async def bootstrap(
    identity: Annotated[AuthenticatedIdentity, Depends(require_authenticated_identity)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> BootstrapResponse:
    return await bootstrap_account(identity, session, settings)
