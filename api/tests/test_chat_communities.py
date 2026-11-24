from tests.conftest import AccountClients


async def test_official_communities_are_available_without_creators(
    account_clients: AccountClients,
) -> None:
    response = await account_clients.owner.get("/api/v1/chat/spaces/public")

    assert response.status_code == 200
    spaces = response.json()["spaces"]
    assert {space["name"]: space["cover"] for space in spaces} == {
        "Beekeepers": "/photos/brood-comb.webp",
        "General Farmers": "/photos/olive-foliage.webp",
    }
    assert all(space["is_system"] and space["creator_id"] is None for space in spaces)
    assert all(space["member_count"] == 0 for space in spaces)


async def test_membership_and_messages_survive_separate_requests(
    account_clients: AccountClients,
) -> None:
    from uuid import uuid4

    owner, other = account_clients.owner, account_clients.other
    spaces = (await owner.get("/api/v1/chat/spaces/public")).json()["spaces"]
    for space in spaces:
        path = f"/api/v1/chat/spaces/{space['id']}"
        payload = {"body": "Hello from the community.", "client_id": str(uuid4())}
        assert (await owner.post(f"{path}/messages", json=payload)).status_code == 403
        assert (await owner.post(f"{path}/join")).status_code == 200
        assert (await owner.post(f"{path}/join")).status_code == 200
        assert (await owner.get(f"{path}/me")).json()["state"] == "active"
        assert (await owner.get(path)).json()["member_count"] == 1

        sent = await owner.post(f"{path}/messages", json=payload)
        assert sent.status_code == 201
        assert (await owner.post(f"{path}/messages", json=payload)).json() == sent.json()
        assert (await other.get(f"{path}/messages")).json()["messages"] == []

        assert (await other.post(f"{path}/join")).status_code == 200
        assert (await other.get(f"{path}/messages")).json()["messages"] == [sent.json()]
        assert (await other.post(f"{path}/messages", json=payload)).status_code == 409
        later = await other.post(f"{path}/messages", json={"body": "Hello back."})
        assert later.status_code == 201
        first = (await owner.get(f"{path}/messages", params={"limit": 1})).json()
        assert first["messages"] == [later.json()]
        earlier = await owner.get(f"{path}/messages", params={"cursor": first["next_cursor"]})
        assert earlier.json()["messages"] == [sent.json()]

        assert (await owner.post(f"{path}/leave")).status_code == 204
        assert (await owner.post(f"{path}/leave")).status_code == 204
        assert (await owner.get(f"{path}/me")).json()["state"] == "left"
        assert (await owner.get(f"{path}/messages")).json()["messages"] == []
        assert len((await other.get(f"{path}/messages")).json()["messages"]) == 2
