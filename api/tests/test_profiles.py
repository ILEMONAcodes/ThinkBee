import pytest

from tests.conftest import AccountClients


async def test_profile_create_patch_and_privacy(account_clients: AccountClients) -> None:
    owner, other = account_clients.owner, account_clients.other
    assert (await owner.get("/api/v1/me/chat-profile")).status_code == 404
    created = await owner.patch("/api/v1/me/chat-profile", json={"display_name": "  Ada  "})
    assert created.status_code == 200
    assert created.json()["display_name"] == "Ada"
    assert created.json()["show_crops"] is False
    assert created.json()["show_hive_type"] is False
    assert created.json()["photo_key"] is None
    changed = await owner.patch(
        "/api/v1/me/chat-profile",
        json={
            "bio": "I keep bees",
            "area_state": "Oyo",
            "area_lga": "Ibadan North",
            "show_hive_type": True,
        },
    )
    assert changed.status_code == 200
    assert changed.json()["display_name"] == "Ada"
    assert (await owner.get("/api/v1/me/chat-profile")).json() == changed.json()
    assert (await other.get("/api/v1/me/chat-profile")).status_code == 404
    cleared = await owner.patch(
        "/api/v1/me/chat-profile", json={"area_state": None, "area_lga": None}
    )
    assert cleared.json()["area_state"] is None
    assert cleared.json()["area_lga"] is None
    assert not {"email", "supabase_user_id", "lat", "lng", "user_id"} & cleared.json().keys()


async def test_preferences_cannot_change_privileges(account_clients: AccountClients) -> None:
    client = account_clients.owner
    assert (await client.patch("/api/v1/me", json={"locale": "en-NG"})).status_code == 200
    unsupported = await client.patch("/api/v1/me", json={"locale": "zz-ZZ"})
    assert unsupported.status_code == 422
    assert unsupported.json()["error"]["code"] == "unsupported_locale"
    forbidden = await client.patch(
        "/api/v1/me", json={"locale": "en-NG", "is_think_bee_admin": True}
    )
    assert forbidden.status_code == 422
    assert (await client.get("/api/v1/me")).json()["is_think_bee_admin"] is False


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"display_name": "  "},
        {"display_name": None},
        {"bio": None},
        {"show_crops": None},
        {"photo_key": "someone-elses-photo"},
        {"display_name": "Ada", "area_lga": "Ibadan North"},
        {"bio": "a" * 281},
    ],
)
async def test_invalid_profile_is_not_saved(
    account_clients: AccountClients, payload: dict[str, object]
) -> None:
    response = await account_clients.owner.patch("/api/v1/me/chat-profile", json=payload)
    assert response.status_code == 422
    assert (await account_clients.owner.get("/api/v1/me/chat-profile")).status_code == 404
