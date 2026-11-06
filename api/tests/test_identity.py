import asyncio
import re
import time
from collections.abc import AsyncIterator
from uuid import UUID, uuid4

import httpx
import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from httpx import ASGITransport, AsyncClient, Request, Response
from sqlalchemy import func, inspect, select, update
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import Settings, get_settings
from app.core.security import SupabaseJWTVerifier, get_supabase_jwt_verifier
from app.db import session as database
from app.db.ids import uuid7
from app.db.models import Base
from app.main import create_app
from app.modules.users import service
from app.modules.users.models import User
from tests.conftest import migrate
from tests.test_security import _key_pair, _settings, _token


@pytest.fixture
async def client(
    database_engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> AsyncIterator[AsyncClient]:
    factory = async_sessionmaker(database_engine, expire_on_commit=False)
    monkeypatch.setattr(database, "async_session_factory", factory)
    private_key, public_key = _key_pair("identity-tests")

    def keys(_: Request) -> Response:
        return Response(200, json={"keys": [public_key]})

    async with AsyncClient(transport=httpx.MockTransport(keys)) as jwks_client:
        verifier = SupabaseJWTVerifier(_settings(), http_client=jwks_client)
        application = create_app()
        application.dependency_overrides[get_supabase_jwt_verifier] = lambda: verifier
        application.dependency_overrides[get_settings] = lambda: Settings(_env_file=None)
        token = _token(private_key, "identity-tests")
        async with AsyncClient(
            transport=ASGITransport(app=application),
            base_url="http://test",
            headers={"Authorization": f"Bearer {token}"},
        ) as http_client:
            yield http_client


def test_identifiers_follow_required_formats() -> None:
    before = time.time_ns() // 1_000_000
    identifiers = [uuid7() for _ in range(1000)]
    after = time.time_ns() // 1_000_000
    assert len(set(identifiers)) == len(identifiers)
    for identifier in identifiers:
        assert identifier.version == 7
        assert before <= identifier.int >> 80 <= after
    for _ in range(100):
        assert re.fullmatch(r"TB-[0-9A-HJKMNP-TV-Z]{8}", service.generate_farmer_id())


async def test_bootstrap_retry_and_session_lookup(
    client: AsyncClient, database_engine: AsyncEngine
) -> None:
    first = await client.post("/api/v1/auth/bootstrap")
    second = await client.post("/api/v1/auth/bootstrap")
    current = await client.get("/api/v1/me")
    assert first.status_code == second.status_code == current.status_code == 200
    assert first.json()["is_new"] is True
    assert second.json()["is_new"] is False
    user = first.json()["user"]
    assert user == second.json()["user"] == current.json()
    assert UUID(user["id"]).version == 7
    assert re.fullmatch(r"TB-[0-9A-HJKMNP-TV-Z]{8}", user["farmer_id"])
    assert user["status"] == "active"
    assert user["is_think_bee_admin"] is False
    assert user["locale"] == "en-NG"
    assert set(user) == {
        "id",
        "farmer_id",
        "status",
        "is_think_bee_admin",
        "locale",
        "last_seen_at",
        "created_at",
        "updated_at",
    }
    async with AsyncSession(database_engine) as session:
        assert await session.scalar(select(func.count()).select_from(User)) == 1


async def test_concurrent_bootstrap_creates_one_account(client: AsyncClient) -> None:
    responses = await asyncio.gather(*(client.post("/api/v1/auth/bootstrap") for _ in range(12)))
    assert all(response.status_code == 200 for response in responses)
    assert sum(response.json()["is_new"] for response in responses) == 1
    assert len({response.json()["user"]["id"] for response in responses}) == 1
    assert len({response.json()["user"]["farmer_id"] for response in responses}) == 1


async def test_session_without_mapping_requires_bootstrap(client: AsyncClient) -> None:
    response = await client.get("/api/v1/me")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "auth_bootstrap_required"


@pytest.mark.parametrize("status", ["suspended", "deleted"])
async def test_inactive_account_cannot_bootstrap_or_use_session(
    client: AsyncClient, database_engine: AsyncEngine, status: str
) -> None:
    first = await client.post("/api/v1/auth/bootstrap")
    user_id = UUID(first.json()["user"]["id"])
    async with AsyncSession(database_engine) as session, session.begin():
        await session.execute(update(User).where(User.id == user_id).values(status=status))
    for method, path in [("POST", "/api/v1/auth/bootstrap"), ("GET", "/api/v1/me")]:
        response = await client.request(method, path)
        assert response.status_code == 403
        assert response.json()["error"]["code"] == f"account_{status}"
    async with AsyncSession(database_engine) as session:
        assert await session.scalar(select(func.count()).select_from(User)) == 1


async def test_farmer_id_collision_retries_without_losing_account(
    client: AsyncClient, database_engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(service, "generate_farmer_id", lambda: "TB-00000000")
    first = await client.post("/api/v1/auth/bootstrap")
    assert first.status_code == 200
    ids = iter(["TB-00000000", "TB-11111111"])
    monkeypatch.setattr(service, "generate_farmer_id", lambda: next(ids))
    async with AsyncSession(database_engine, expire_on_commit=False) as session:
        user, is_new = await service.bootstrap_user(
            session, uuid4(), max_attempts=5, default_locale="en-NG"
        )
    assert is_new
    assert user.farmer_id == "TB-11111111"
    assert str(user.id) != first.json()["user"]["id"]


async def test_collision_limit_rolls_back_and_retry_recovers(
    client: AsyncClient, database_engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls = 0

    def colliding_id() -> str:
        nonlocal calls
        calls += 1
        return "TB-00000000"

    monkeypatch.setattr(service, "generate_farmer_id", colliding_id)
    async with AsyncSession(database_engine, expire_on_commit=False) as session:
        await service.bootstrap_user(session, uuid4(), max_attempts=5, default_locale="en-NG")
    failed = await client.post("/api/v1/auth/bootstrap")
    assert failed.status_code == 503
    assert failed.json()["error"]["code"] == "farmer_id_unavailable"
    assert calls == 6
    async with AsyncSession(database_engine) as session:
        assert await session.scalar(select(func.count()).select_from(User)) == 1
    monkeypatch.setattr(service, "generate_farmer_id", lambda: "TB-11111111")
    retried = await client.post("/api/v1/auth/bootstrap")
    assert retried.status_code == 200
    assert retried.json()["is_new"] is True


async def test_migration_matches_models_and_is_reversible(database_engine: AsyncEngine) -> None:
    def check(connection: Connection) -> None:
        context = MigrationContext.configure(connection)
        assert compare_metadata(context, Base.metadata) == []
        migrate(connection, "base", downgrade=True)
        assert "users" not in inspect(connection).get_table_names()
        migrate(connection)
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []

    async with database_engine.begin() as connection:
        await connection.run_sync(check)
