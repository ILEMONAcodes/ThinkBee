import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from asyncpg import InvalidPasswordError
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import Settings
from app.db import health
from app.db import session as database
from app.main import app, create_app


async def test_health_live() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.parametrize(
    "failure",
    [
        OSError("private database URL"),
        InvalidPasswordError("private database URL"),
        TimeoutError("private database URL"),
        ProgrammingError("private SQL", {}, Exception("missing table")),
    ],
)
async def test_readiness_rejects_an_unavailable_account_store(
    monkeypatch: pytest.MonkeyPatch, failure: Exception,
) -> None:
    engine = MagicMock()
    engine.connect.return_value.__aenter__.side_effect = failure
    monkeypatch.setattr(database, "engine", engine)
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://test"
    ) as client:
        response = await client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "account_store_unavailable"
    assert "private" not in response.text


async def test_readiness_checks_the_migrated_schema(
    database_engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(database, "engine", database_engine)
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://test"
    ) as client:
        assert (await client.get("/health/ready")).status_code == 200
        # This fixture owns an isolated test schema, never the application schema.
        async with database_engine.begin() as connection:
            await connection.execute(text("DROP TABLE chat_profiles"))
        response = await client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "account_store_unavailable"


async def test_readiness_deadline_bounds_a_stalled_query(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = Settings(_env_file=None, readiness_timeout_seconds=0.01)
    monkeypatch.setattr(health, "get_settings", lambda: settings)
    connection = AsyncMock()

    async def stalled_query(*_: object) -> None:
        await asyncio.Event().wait()

    connection.execute.side_effect = stalled_query
    engine = MagicMock()
    engine.connect.return_value.__aenter__.return_value = connection
    monkeypatch.setattr(database, "engine", engine)
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://test"
    ) as client:
        response = await asyncio.wait_for(client.get("/health/ready"), timeout=1)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "account_store_unavailable"


async def test_liveness_does_not_require_the_database(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = MagicMock()
    engine.connect.return_value.__aenter__ = AsyncMock(side_effect=OSError("unavailable"))
    monkeypatch.setattr(database, "engine", engine)
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://test"
    ) as client:
        response = await client.get("/health/live")
    assert response.status_code == 200
    engine.connect.assert_not_called()
