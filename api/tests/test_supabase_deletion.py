import json
from uuid import uuid4

import httpx
import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.modules.auth.admin import AuthDeletionUnavailable, delete_supabase_user


@pytest.mark.parametrize(
    "status,body",
    [
        (200, {}),
        (204, None),
        (404, {"code": "user_not_found"}),
        (403, {"code": "user_not_found"}),
    ],
)
async def test_supabase_admin_deletes_or_accepts_already_deleted(
    status: int, body: dict[str, str] | None
) -> None:
    subject = uuid4()
    settings = Settings(
        _env_file=None,
        supabase_url="https://project.supabase.co",
        supabase_service_role_key=SecretStr("test-secret"),
    )

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "DELETE"
        assert request.url.path == f"/auth/v1/admin/users/{subject}"
        assert request.headers["apikey"] == "test-secret"
        assert request.headers["authorization"] == "Bearer test-secret"
        assert json.loads(request.content) == {"should_soft_delete": False}
        return httpx.Response(status, json=body)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        await delete_supabase_user(settings, subject, http_client=client)


@pytest.mark.parametrize("status", [400, 401, 403, 404, 429, 500])
async def test_failed_admin_deletion_is_retryable_without_private_details(status: int) -> None:
    settings = Settings(
        _env_file=None,
        supabase_url="https://project.supabase.co",
        supabase_service_role_key=SecretStr("test-secret"),
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status, json={"message": "private provider details"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(AuthDeletionUnavailable) as error:
            await delete_supabase_user(settings, uuid4(), http_client=client)
    assert str(error.value) == "auth_deletion_unavailable"


async def test_admin_timeout_does_not_lose_deletion() -> None:
    settings = Settings(
        _env_file=None,
        supabase_url="https://project.supabase.co",
        supabase_service_role_key=SecretStr("test-secret"),
    )

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("private request details", request=request)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(AuthDeletionUnavailable, match="^auth_deletion_unavailable$"):
            await delete_supabase_user(settings, uuid4(), http_client=client)


async def test_missing_admin_config_is_retryable() -> None:
    with pytest.raises(AuthDeletionUnavailable, match="auth_deletion_not_configured"):
        await delete_supabase_user(Settings(_env_file=None), uuid4())
