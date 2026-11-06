from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.core.errors import AppError
from app.modules.auth.admin import AuthDeletionUnavailable, delete_supabase_user
from app.modules.farms.service import delete_owned_farms
from app.modules.users.models import AccountDeletion, ChatProfile, User
from app.modules.users.schemas import DeletionResponse


async def request_deletion(
    session: AsyncSession, subject: UUID, settings: Settings
) -> DeletionResponse:
    async with session.begin():
        # Same lock taken by all authenticated writes: nothing can be recreated after purge.
        user = await session.scalar(
            select(User).where(User.supabase_user_id == subject).with_for_update()
        )
        if user is None:
            raise AppError(
                status_code=409,
                code="auth_bootstrap_required",
                message="Finish setting up your Think Bee account to continue.",
            )
        job = await session.get(AccountDeletion, user.id)
        if job is None:
            await delete_owned_farms(session, user.id)
            await session.execute(delete(ChatProfile).where(ChatProfile.user_id == user.id))
            user.status = "deleted"
            user.is_think_bee_admin = False
            user.last_seen_at = None
            user.locale = settings.default_locale
            job = AccountDeletion(user_id=user.id, next_attempt_at=datetime.now(UTC))
            session.add(job)
            await session.flush()
        return DeletionResponse(
            status=job.status, requested_at=job.created_at, completed_at=job.completed_at
        )


async def process_pending_deletions(
    factory: async_sessionmaker[AsyncSession], settings: Settings
) -> int:
    completed = 0
    for _ in range(settings.deletion_batch_size):
        async with factory() as session, session.begin():
            now = datetime.now(UTC)
            job = await session.scalar(
                select(AccountDeletion)
                .where(AccountDeletion.status == "pending", AccountDeletion.next_attempt_at <= now)
                .order_by(AccountDeletion.next_attempt_at, AccountDeletion.user_id)
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            if job is None:
                break
            user = await session.get(User, job.user_id)
            assert user is not None and user.status == "deleted"
            job.attempts += 1
            try:
                await delete_supabase_user(settings, user.supabase_user_id)
            except AuthDeletionUnavailable as exc:
                job.last_error_code = str(exc)
                delay = min(
                    settings.deletion_retry_seconds * 2 ** min(job.attempts - 1, 20),
                    settings.deletion_max_retry_seconds,
                )
                job.next_attempt_at = now + timedelta(seconds=delay)
            else:
                job.status = "completed"
                job.completed_at = datetime.now(UTC)
                job.last_error_code = None
                completed += 1
    return completed
