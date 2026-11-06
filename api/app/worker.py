from typing import Any

from arq import cron
from arq.connections import RedisSettings

from app.core.config import get_settings
from app.db.session import async_session_factory
from app.modules.users.deletion_service import process_pending_deletions


async def account_deletion_job(ctx: dict[str, Any]) -> int:
    """ARQ supplies a dictionary context; no personal data enters job arguments or results."""
    return await process_pending_deletions(async_session_factory, get_settings())


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    cron_jobs = [cron(account_deletion_job, minute=set(range(60)), run_at_startup=True)]
    # Durable pending work remains in Postgres across worker/Redis restarts.
    job_timeout = get_settings().deletion_job_timeout_seconds
