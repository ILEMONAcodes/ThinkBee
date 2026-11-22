import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.modules.chat.schemas import ChatSpaceResponse
from scripts.export_openapi import write_openapi_schema


def test_export_openapi_schema(tmp_path: Path) -> None:
    output = tmp_path / "openapi.json"

    write_openapi_schema(output)

    schema = json.loads(output.read_text(encoding="utf-8"))
    assert schema["info"]["title"] == "Think Bee API"
    assert schema["info"]["version"] == "0.1.0"
    assert "/health/live" in schema["paths"]
    assert "/health/ready" in schema["paths"]
    for path, method in [("/api/v1/auth/bootstrap", "post"), ("/api/v1/me", "get")]:
        operation = schema["paths"][path][method]
        assert operation["security"] == [{"SupabaseJWT": []}]
        assert {"200", "401", "403", "503"} <= operation["responses"].keys()
    assert "409" in schema["paths"]["/api/v1/me"]["get"]["responses"]
    assert "security" not in schema["paths"]["/health/live"]["get"]
    cover = schema["components"]["schemas"]["ChatSpaceResponse"]["properties"]["cover"]
    assert cover["readOnly"] is True


def test_chat_space_serializes_cover_from_avatar_key() -> None:
    now = datetime.now(UTC)
    space = ChatSpaceResponse(
        id=uuid4(),
        creator_id=uuid4(),
        name="Beekeepers",
        kind="community",
        visibility="public",
        avatar_key="/photos/brood-comb.webp",
        member_count=0,
        is_system=True,
        created_at=now,
        updated_at=now,
    )

    assert space.model_dump()["cover"] == space.avatar_key
    assert space.model_copy(update={"avatar_key": None}).model_dump()["cover"] is None
