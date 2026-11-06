import os
from collections.abc import AsyncIterator
from dataclasses import dataclass
from uuid import uuid4

import httpx
import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient, Request, Response
from sqlalchemy import text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import Settings, get_settings
from app.core.security import SupabaseJWTVerifier, get_supabase_jwt_verifier
from app.db import session as database
from app.main import create_app
from tests.test_security import _key_pair, _settings, _token


def migrate(connection: Connection, revision: str = "head", *, downgrade: bool = False) -> None:
    config = Config("alembic.ini")
    config.attributes["connection"] = connection
    if downgrade:
        command.downgrade(config, revision)
    else:
        command.upgrade(config, revision)


@pytest.fixture
async def database_engine() -> AsyncIterator[AsyncEngine]:
    """Use an explicit test database and a fresh schema; never use the app's .env URL."""
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL to run PostgreSQL integration tests.")
    schema = f"test_identity_{uuid4().hex}"
    admin_engine = create_async_engine(url, poolclass=NullPool, hide_parameters=True)
    engine = create_async_engine(
        url,
        poolclass=NullPool,
        hide_parameters=True,
        connect_args={"server_settings": {"search_path": schema}},
    )
    try:
        async with admin_engine.begin() as connection:
            await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        async with engine.begin() as connection:
            await connection.run_sync(migrate)
        yield engine
    finally:
        await engine.dispose()
        async with admin_engine.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        await admin_engine.dispose()


@dataclass
class AccountClients:
    owner: AsyncClient
    other: AsyncClient
    app: FastAPI
    settings: Settings


@pytest.fixture
async def account_clients(
    database_engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> AsyncIterator[AccountClients]:
    monkeypatch.setattr(
        database,
        "async_session_factory",
        async_sessionmaker(database_engine, expire_on_commit=False),
    )
    private_key, public_key = _key_pair("account-tests")
    settings = Settings(_env_file=None)

    def keys(_: Request) -> Response:
        return Response(200, json={"keys": [public_key]})

    async with AsyncClient(transport=httpx.MockTransport(keys)) as jwks_client:
        verifier = SupabaseJWTVerifier(_settings(), http_client=jwks_client)
        application = create_app()
        application.dependency_overrides[get_supabase_jwt_verifier] = lambda: verifier
        application.dependency_overrides[get_settings] = lambda: settings
        transport = ASGITransport(app=application)
        async with (
            AsyncClient(
                transport=transport,
                base_url="http://test",
                headers={"Authorization": f"Bearer {_token(private_key, 'account-tests')}"},
            ) as owner,
            AsyncClient(
                transport=transport,
                base_url="http://test",
                headers={"Authorization": f"Bearer {_token(private_key, 'account-tests')}"},
            ) as other,
        ):
            assert (await owner.post("/api/v1/auth/bootstrap")).status_code == 200
            assert (await other.post("/api/v1/auth/bootstrap")).status_code == 200
            yield AccountClients(owner=owner, other=other, app=application, settings=settings)
