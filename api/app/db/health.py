import asyncio

from asyncpg import PostgresError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.core.errors import AppError
from app.db import session as database
from app.modules.users.models import ChatProfile, User


async def check_account_store() -> None:
    """Check connectivity and the account schema without reading farmer data."""
    try:
        async with asyncio.timeout(get_settings().readiness_timeout_seconds):
            async with database.engine.connect() as connection:
                await connection.execute(select(User).limit(0))
                await connection.execute(select(ChatProfile).limit(0))
    except (SQLAlchemyError, PostgresError, OSError, TimeoutError):
        raise AppError(
            status_code=503,
            code="account_store_unavailable",
            message="The account database is not ready. Please try again shortly.",
        ) from None
