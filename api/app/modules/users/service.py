import secrets
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.modules.users.models import User
from app.modules.users.schemas import UserResponse

CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def generate_farmer_id() -> str:
    return "TB-" + "".join(secrets.choice(CROCKFORD_BASE32) for _ in range(8))


async def bootstrap_user(
    session: AsyncSession,
    supabase_user_id: UUID,
    *,
    max_attempts: int,
    default_locale: str,
) -> tuple[UserResponse, bool]:
    """Commit one mapping, including when requests race or a farmer ID collides."""
    async with session.begin():
        existing = await session.scalar(
            select(User).where(User.supabase_user_id == supabase_user_id)
        )
        if existing is not None:
            return _active_user(existing), False

        for _ in range(max_attempts):
            created = await session.scalar(
                insert(User)
                .values(
                    supabase_user_id=supabase_user_id,
                    farmer_id=generate_farmer_id(),
                    locale=default_locale,
                    last_seen_at=datetime.now(UTC),
                )
                .on_conflict_do_nothing()
                .returning(User)
            )
            if created is not None:
                return _active_user(created), True

            # READ COMMITTED sees a competing bootstrap after its insert commits.
            existing = await session.scalar(
                select(User).where(User.supabase_user_id == supabase_user_id)
            )
            if existing is not None:
                return _active_user(existing), False

    raise AppError(
        status_code=503,
        code="farmer_id_unavailable",
        message="We could not finish setting up your account. Try again shortly.",
    )


async def get_active_user(
    session: AsyncSession, supabase_user_id: UUID, *, lock: bool = False
) -> UserResponse:
    query = select(User).where(User.supabase_user_id == supabase_user_id)
    if lock:
        query = query.with_for_update()
    user = await session.scalar(query)
    if user is None:
        raise AppError(
            status_code=409,
            code="auth_bootstrap_required",
            message="Finish setting up your Think Bee account to continue.",
        )
    return _active_user(user)


def _active_user(user: User) -> UserResponse:
    if user.status != "active":
        raise AppError(
            status_code=403,
            code=f"account_{user.status}",
            message=(
                "Your account is suspended. Contact the Think Bee team for help."
                if user.status == "suspended"
                else "This Think Bee account has been deleted."
            ),
        )
    return UserResponse.model_validate(user)
