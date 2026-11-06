import asyncio
from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.core.errors import AppError
from app.modules.auth import service as auth_service
from app.modules.auth.admin import AuthDeletionUnavailable
from app.modules.farms.models import Farm, FarmUnit
from app.modules.farms.service import delete_owned_farms
from app.modules.users import deletion_service
from app.modules.users.models import AccountDeletion, ChatProfile, User
from app.modules.users.schemas import UserResponse
from app.modules.users.service import get_active_user
from tests.conftest import AccountClients
from tests.test_farms import add_farm, farm_payload, unit_payload


async def test_delete_purges_only_owner_and_blocks_old_token(
    account_clients: AccountClients, database_engine: AsyncEngine
) -> None:
    owner, other = account_clients.owner, account_clients.other
    owner_id = UUID((await owner.get("/api/v1/me")).json()["id"])
    await owner.patch("/api/v1/me/chat-profile", json={"display_name": "Ada"})
    farm_id = await add_farm(owner, lat=7.3, lng=3.9)
    await owner.post(f"/api/v1/farms/{farm_id}/units", json=unit_payload())
    other_farm = await add_farm(other)
    first = await owner.delete("/api/v1/me")
    retried = await owner.delete("/api/v1/me")
    assert first.status_code == retried.status_code == 202
    assert first.json() == retried.json()
    assert first.json()["status"] == "pending"
    for method, path, payload in [
        ("GET", "/me", None),
        ("POST", "/auth/bootstrap", None),
        ("POST", "/farms", farm_payload()),
        ("PATCH", "/me/chat-profile", {"display_name": "Again"}),
    ]:
        response = await owner.request(method, "/api/v1" + path, json=payload)
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "account_deleted"
    assert (await other.get(f"/api/v1/farms/{other_farm}")).status_code == 200
    async with AsyncSession(database_engine) as session:
        user = await session.get(User, owner_id)
        assert user is not None and user.status == "deleted"
        assert user.is_think_bee_admin is False and user.last_seen_at is None
        assert await session.get(ChatProfile, owner_id) is None
        assert await session.scalar(select(func.count()).select_from(FarmUnit)) == 0
        assert (
            await session.scalar(
                select(func.count()).select_from(Farm).where(Farm.user_id == owner_id)
            )
            == 0
        )
        assert await session.scalar(select(func.count()).select_from(AccountDeletion)) == 1


async def test_suspended_user_can_request_deletion(
    account_clients: AccountClients, database_engine: AsyncEngine
) -> None:
    user_id = UUID((await account_clients.owner.get("/api/v1/me")).json()["id"])
    async with AsyncSession(database_engine) as session, session.begin():
        await session.execute(update(User).where(User.id == user_id).values(status="suspended"))
    assert (await account_clients.owner.get("/api/v1/farms")).status_code == 403
    assert (await account_clients.owner.delete("/api/v1/me")).status_code == 202


async def test_deletion_rollback_keeps_account_and_data(
    account_clients: AccountClients, database_engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    farm_id = await add_farm(account_clients.owner)
    original = delete_owned_farms

    async def fail_after_purge(session: AsyncSession, user_id: UUID) -> None:
        await original(session, user_id)
        raise AppError(status_code=503, code="test_failure", message="Please retry.")

    monkeypatch.setattr(deletion_service, "delete_owned_farms", fail_after_purge)
    assert (await account_clients.owner.delete("/api/v1/me")).status_code == 503
    assert (await account_clients.owner.get("/api/v1/me")).json()["status"] == "active"
    assert (await account_clients.owner.get(f"/api/v1/farms/{farm_id}")).status_code == 200
    async with AsyncSession(database_engine) as session:
        assert await session.scalar(select(func.count()).select_from(AccountDeletion)) == 0


async def test_write_waiting_for_deletion_cannot_recreate_data(
    account_clients: AccountClients, database_engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    locked, release, write_started = asyncio.Event(), asyncio.Event(), asyncio.Event()
    original_purge = delete_owned_farms
    original_guard = get_active_user

    async def paused_purge(session: AsyncSession, user_id: UUID) -> None:
        locked.set()
        await asyncio.wait_for(release.wait(), 5)
        await original_purge(session, user_id)

    async def observed_guard(
        session: AsyncSession, subject: UUID, *, lock: bool = False
    ) -> UserResponse:
        if lock:
            write_started.set()
        return await original_guard(session, subject, lock=lock)

    monkeypatch.setattr(deletion_service, "delete_owned_farms", paused_purge)
    monkeypatch.setattr(auth_service, "get_active_user", observed_guard)
    deletion = asyncio.create_task(account_clients.owner.delete("/api/v1/me"))
    await asyncio.wait_for(locked.wait(), 5)
    write = asyncio.create_task(account_clients.owner.post("/api/v1/farms", json=farm_payload()))
    await asyncio.wait_for(write_started.wait(), 5)
    release.set()
    deleted, rejected = await asyncio.gather(deletion, write)
    assert deleted.status_code == 202 and rejected.status_code == 403
    async with AsyncSession(database_engine) as session:
        assert await session.scalar(select(func.count()).select_from(Farm)) == 0


async def test_deletion_worker_retries_durably_then_completes(
    account_clients: AccountClients, database_engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    assert (await account_clients.owner.delete("/api/v1/me")).status_code == 202
    factory = async_sessionmaker(database_engine, expire_on_commit=False)
    calls = 0

    async def provider(settings: Settings, subject: UUID) -> None:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise AuthDeletionUnavailable("auth_deletion_unavailable")

    monkeypatch.setattr(deletion_service, "delete_supabase_user", provider)
    assert await deletion_service.process_pending_deletions(factory, account_clients.settings) == 0
    async with factory() as session, session.begin():
        job = await session.scalar(select(AccountDeletion))
        assert job is not None and job.status == "pending" and job.attempts == 1
        assert job.next_attempt_at > datetime.now(UTC)
        assert job.last_error_code == "auth_deletion_unavailable"
    assert await deletion_service.process_pending_deletions(factory, account_clients.settings) == 0
    assert calls == 1
    async with factory() as session, session.begin():
        await session.execute(
            update(AccountDeletion).values(next_attempt_at=datetime.now(UTC) - timedelta(seconds=1))
        )
    assert await deletion_service.process_pending_deletions(factory, account_clients.settings) == 1
    result = await account_clients.owner.delete("/api/v1/me")
    assert result.json()["status"] == "completed" and result.json()["completed_at"] is not None
    assert await deletion_service.process_pending_deletions(factory, account_clients.settings) == 0
    assert calls == 2


async def test_parallel_workers_do_not_duplicate_jobs(
    account_clients: AccountClients, database_engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch
) -> None:
    await account_clients.owner.delete("/api/v1/me")
    await account_clients.other.delete("/api/v1/me")
    calls: list[UUID] = []

    async def provider(settings: Settings, subject: UUID) -> None:
        calls.append(subject)
        await asyncio.sleep(0)

    monkeypatch.setattr(deletion_service, "delete_supabase_user", provider)
    factory = async_sessionmaker(database_engine, expire_on_commit=False)
    results = await asyncio.gather(
        *(
            deletion_service.process_pending_deletions(factory, account_clients.settings)
            for _ in range(2)
        )
    )
    assert sum(results) == 2
    assert len(calls) == len(set(calls)) == 2
