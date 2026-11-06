from uuid import UUID

import httpx

from app.core.config import Settings


class AuthDeletionUnavailable(Exception):
    """Only a safe error code crosses the worker boundary."""


async def delete_supabase_user(
    settings: Settings, subject: UUID, *, http_client: httpx.AsyncClient | None = None
) -> None:
    key = settings.supabase_service_role_key.get_secret_value()
    if not settings.normalized_supabase_url or not key:
        raise AuthDeletionUnavailable("auth_deletion_not_configured")
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    url = f"{settings.normalized_supabase_url}/auth/v1/admin/users/{subject}"
    try:
        if http_client is None:
            async with httpx.AsyncClient(timeout=settings.supabase_admin_timeout_seconds) as client:
                response = await client.request(
                    "DELETE", url, headers=headers, json={"should_soft_delete": False}
                )
        else:
            response = await http_client.request(
                "DELETE", url, headers=headers, json={"should_soft_delete": False}
            )
    except httpx.HTTPError:
        raise AuthDeletionUnavailable("auth_deletion_unavailable") from None
    if response.status_code in {403, 404}:
        # Only Supabase's explicit user-not-found response confirms a completed retry.
        try:
            if response.json().get("code") == "user_not_found":
                return
        except (ValueError, AttributeError):
            pass
    if response.status_code not in {200, 204}:
        raise AuthDeletionUnavailable("auth_deletion_unavailable")
