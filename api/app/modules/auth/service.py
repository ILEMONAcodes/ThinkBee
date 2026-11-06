from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.security import AuthenticatedIdentity, require_authenticated_identity
from app.db.session import get_session
from app.modules.auth.schemas import BootstrapResponse
from app.modules.users.schemas import UserResponse
from app.modules.users.service import bootstrap_user, get_active_user


async def bootstrap_account(
    identity: AuthenticatedIdentity, session: AsyncSession, settings: Settings
) -> BootstrapResponse:
    user, is_new = await bootstrap_user(
        session,
        identity.supabase_user_id,
        max_attempts=settings.farmer_id_max_attempts,
        default_locale=settings.default_locale,
    )
    return BootstrapResponse(user=user, is_new=is_new)


async def require_current_user(
    identity: Annotated[AuthenticatedIdentity, Depends(require_authenticated_identity)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserResponse:
    """Shared guard for protected application routes after bootstrap."""
    return await get_active_user(session, identity.supabase_user_id)
