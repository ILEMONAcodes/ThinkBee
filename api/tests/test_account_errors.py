from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from asyncpg import InvalidPasswordError
from httpx import ASGITransport, AsyncClient

from app.core.security import (
    AuthenticatedIdentity,
    SupabaseJWTVerifier,
    get_supabase_jwt_verifier,
    require_authenticated_identity,
)
from app.db import session as database
from app.main import create_app
from tests.test_security import _settings


@pytest.mark.parametrize("path", ["/api/v1/auth/bootstrap", "/api/v1/me"])
@pytest.mark.parametrize("authorization", [None, "Bearer malformed-token", "Basic invalid"])
async def test_account_routes_require_valid_bearer(path: str, authorization: str | None) -> None:
    headers = {"Authorization": authorization} if authorization else {}
    application = create_app()
    verifier = SupabaseJWTVerifier(_settings())
    application.dependency_overrides[get_supabase_jwt_verifier] = lambda: verifier
    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://test"
    ) as client:
        response = await client.request(
            "POST" if path.endswith("bootstrap") else "GET", path, headers=headers
        )
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize(
    "failure",
    [
        OSError("private connection details"),
        InvalidPasswordError("private connection details"),
        TimeoutError("private connection details"),
    ],
)
async def test_unavailable_database_has_safe_retryable_error(
    monkeypatch: pytest.MonkeyPatch, failure: Exception,
) -> None:
    broken_session = AsyncMock()
    broken_session.__aenter__.side_effect = failure
    monkeypatch.setattr(database, "async_session_factory", lambda: broken_session)
    application = create_app()
    application.dependency_overrides[require_authenticated_identity] = lambda: (
        AuthenticatedIdentity(supabase_user_id=uuid4(), role="authenticated")
    )
    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/me", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "account_store_unavailable"
    assert "private connection details" not in response.text
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
