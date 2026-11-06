import json
from pathlib import Path

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
