import asyncio
from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.conftest import AccountClients


def farm_payload(**changes: object) -> dict[str, object]:
    return {"client_id": str(uuid4()), "name": "Home farm", "kind": "both", **changes}


def unit_payload(**changes: object) -> dict[str, object]:
    return {"client_id": str(uuid4()), "name": "Hive A", "kind": "hive", **changes}


async def add_farm(client: AsyncClient, **changes: object) -> str:
    response = await client.post("/api/v1/farms", json=farm_payload(**changes))
    assert response.status_code == 201, response.text
    return str(response.json()["id"])


async def test_farm_crud_and_coordinate_clear(account_clients: AccountClients) -> None:
    client = account_clients.owner
    assert (await client.get("/api/v1/farms")).json() == {"items": [], "next_cursor": None}
    farm_id = await add_farm(client, state="Oyo", lga="Ibadan North", lat=7.38, lng=3.91)
    loaded = await client.get(f"/api/v1/farms/{farm_id}")
    assert loaded.json()["lat"] == 7.38
    assert "user_id" not in loaded.json()
    changed = await client.patch(f"/api/v1/farms/{farm_id}", json={"name": "North farm"})
    assert changed.json()["name"] == "North farm"
    assert changed.json()["lat"] == 7.38
    cleared = await client.patch(f"/api/v1/farms/{farm_id}", json={"lat": None, "lng": None})
    assert cleared.status_code == 200
    assert cleared.json()["lat"] is None and cleared.json()["lng"] is None
    assert (await client.delete(f"/api/v1/farms/{farm_id}")).status_code == 204
    assert (await client.get(f"/api/v1/farms/{farm_id}")).status_code == 404


async def test_farm_and_unit_retries_and_pagination(account_clients: AccountClients) -> None:
    client = account_clients.owner
    payload = farm_payload()
    responses = await asyncio.gather(
        *(client.post("/api/v1/farms", json=payload) for _ in range(8))
    )
    assert all(response.status_code == 201 for response in responses)
    assert len({response.json()["id"] for response in responses}) == 1
    farm_id = responses[0].json()["id"]
    await add_farm(client)
    first = (await client.get("/api/v1/farms?limit=1")).json()
    second = (
        await client.get("/api/v1/farms", params={"limit": 1, "cursor": first["next_cursor"]})
    ).json()
    assert len(first["items"]) == len(second["items"]) == 1
    assert first["items"][0]["id"] != second["items"][0]["id"]
    assert second["next_cursor"] is None
    unit = unit_payload(details={"hive_type": "Top bar"})
    responses = await asyncio.gather(
        *(client.post(f"/api/v1/farms/{farm_id}/units", json=unit) for _ in range(8))
    )
    assert all(response.status_code == 201 for response in responses)
    assert len({response.json()["id"] for response in responses}) == 1
    assert (await client.get(f"/api/v1/farms/{farm_id}/units")).json()["next_cursor"] is None


async def test_cross_account_access_denied_for_every_farm_operation(
    account_clients: AccountClients,
) -> None:
    owner, other = account_clients.owner, account_clients.other
    farm_id = await add_farm(owner, lat=7.3800123, lng=3.9100432)
    unit = await owner.post(f"/api/v1/farms/{farm_id}/units", json=unit_payload())
    unit_id = unit.json()["id"]
    operations = [
        ("GET", f"/farms/{farm_id}", None),
        ("PATCH", f"/farms/{farm_id}", {"name": "Changed"}),
        ("DELETE", f"/farms/{farm_id}", None),
        ("GET", f"/farms/{farm_id}/units", None),
        ("POST", f"/farms/{farm_id}/units", unit_payload()),
        ("PATCH", f"/units/{unit_id}", {"name": "Changed"}),
        ("DELETE", f"/units/{unit_id}", None),
    ]
    for method, path, payload in operations:
        response = await other.request(method, "/api/v1" + path, json=payload)
        assert response.status_code == 404, (method, path, response.text)
        assert "7.3800123" not in response.text
    assert (await other.get("/api/v1/farms")).json()["items"] == []
    assert (await owner.get(f"/api/v1/farms/{farm_id}")).json()["name"] == "Home farm"


async def test_unit_crud_farm_kind_and_cascade(account_clients: AccountClients) -> None:
    client = account_clients.owner
    farm_id = await add_farm(client)
    hive = await client.post(
        f"/api/v1/farms/{farm_id}/units", json=unit_payload(details={"hive_type": "Langstroth"})
    )
    crop = await client.post(
        f"/api/v1/farms/{farm_id}/units",
        json=unit_payload(
            kind="crop_block",
            name="Cassava field",
            details={"crop": "Cassava", "area_hectares": 0.5},
        ),
    )
    assert hive.status_code == crop.status_code == 201
    conflict = await client.patch(f"/api/v1/farms/{farm_id}", json={"kind": "bees"})
    assert conflict.status_code == 409
    unit_id = hive.json()["id"]
    changed = await client.patch(f"/api/v1/units/{unit_id}", json={"name": "Hive B", "details": {}})
    assert changed.status_code == 200
    assert changed.json()["details"]["hive_type"] is None
    assert (await client.delete(f"/api/v1/units/{crop.json()['id']}")).status_code == 204
    assert (
        await client.patch(f"/api/v1/farms/{farm_id}", json={"kind": "bees"})
    ).status_code == 200
    wrong_kind = await client.post(
        f"/api/v1/farms/{farm_id}/units", json=unit_payload(kind="crop_block")
    )
    assert wrong_kind.status_code == 422
    assert (await client.delete(f"/api/v1/farms/{farm_id}")).status_code == 204
    assert (
        await client.patch(f"/api/v1/units/{unit_id}", json={"name": "Gone"})
    ).status_code == 404


async def test_configured_limits_allow_idempotent_retries(account_clients: AccountClients) -> None:
    client = account_clients.owner
    account_clients.settings.max_farms_per_user = 1
    account_clients.settings.max_units_per_farm = 1
    payload = farm_payload()
    first = await client.post("/api/v1/farms", json=payload)
    assert first.status_code == 201
    assert (await client.post("/api/v1/farms", json=payload)).status_code == 201
    assert (await client.post("/api/v1/farms", json=farm_payload())).status_code == 409
    path = f"/api/v1/farms/{first.json()['id']}/units"
    unit = unit_payload()
    assert (await client.post(path, json=unit)).status_code == 201
    assert (await client.post(path, json=unit)).status_code == 201
    assert (await client.post(path, json=unit_payload())).status_code == 409
    assert (await client.get("/api/v1/farms?limit=101")).status_code == 422


@pytest.mark.parametrize(
    "changes",
    [
        {"name": " "},
        {"kind": "unknown"},
        {"user_id": str(uuid4())},
        {"lat": 7.2},
        {"lat": 91, "lng": 3.9},
        {"lat": 7.2, "lng": 181},
        {"lat": "NaN", "lng": 3.9},
        {"lga": "Ibadan North"},
    ],
)
async def test_invalid_farm_is_not_created(
    account_clients: AccountClients, changes: dict[str, object]
) -> None:
    response = await account_clients.owner.post("/api/v1/farms", json=farm_payload(**changes))
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert (await account_clients.owner.get("/api/v1/farms")).json()["items"] == []


async def test_patch_validation_preserves_existing_values(account_clients: AccountClients) -> None:
    client = account_clients.owner
    farm_id = await add_farm(client, lat=7.123456789, lng=3.9)
    for payload in [{}, {"name": None}, {"lat": None}, {"client_id": str(uuid4())}]:
        response = await client.patch(f"/api/v1/farms/{farm_id}", json=payload)
        assert response.status_code == 422
    private = await client.patch(f"/api/v1/farms/{farm_id}", json={"lat": 7.123456789})
    assert "7.123456789" not in private.text
    assert (await client.get(f"/api/v1/farms/{farm_id}")).json()["lat"] == 7.123456789


@pytest.mark.parametrize(
    "payload",
    [
        unit_payload(details={"crop": "Cassava"}),
        unit_payload(kind="crop_block", details={"hive_type": "Top bar"}),
        unit_payload(kind="crop_block", details={"area_hectares": -1}),
        unit_payload(details={"arbitrary": "value"}),
    ],
)
async def test_invalid_unit_details(
    account_clients: AccountClients, payload: dict[str, object]
) -> None:
    farm_id = await add_farm(account_clients.owner)
    response = await account_clients.owner.post(f"/api/v1/farms/{farm_id}/units", json=payload)
    assert response.status_code == 422
