from collections.abc import AsyncIterator

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.errors import AppError

settings = get_settings()
engine = create_async_engine(settings.database_url, pool_pre_ping=True, hide_parameters=True)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    try:
        async with async_session_factory() as session:
            yield session
    except (SQLAlchemyError, OSError) as exc:
        raise AppError(
            status_code=503,
            code="account_store_unavailable",
            message="We could not load your account. Try again shortly.",
        ) from exc
