from io import BytesIO
from uuid import UUID, uuid4

import pytest
from PIL import Image

from app.core.config import Settings
from app.modules.scans.router import get_scan_service
from app.modules.scans.service import ScanService
from app.providers.ai import MockAIProvider
from app.providers.storage.scan_images import ScanPhotoStorage
from tests.conftest import AccountClients


class TestStorage(ScanPhotoStorage):
    __test__ = False
    photo: bytes

    def _put(self, key: str, photo: bytes) -> None:
        self.photo = photo


async def test_authenticated_photo_and_scan_can_be_saved_and_retrieved(
    account_clients: AccountClients,
) -> None:
    owner = account_clients.owner
    storage = TestStorage()
    account_clients.app.dependency_overrides[ScanPhotoStorage] = lambda: storage
    account_clients.app.dependency_overrides[get_scan_service] = lambda: ScanService(
        MockAIProvider()
    )
    image = Image.new("RGB", (16, 16))
    encoded = BytesIO()
    exif = image.getexif()
    exif[0x010E] = "test metadata"
    image.save(encoded, "PNG", exif=exif)

    upload = await owner.post("/api/v1/scans/photos", content=encoded.getvalue())
    assert upload.status_code == 201
    with Image.open(BytesIO(storage.photo)) as saved_photo:
        assert saved_photo.format == "WEBP"
        assert not saved_photo.getexif()
    invalid = await owner.post("/api/v1/scans/photos", content=b"not a photo")
    assert invalid.status_code == 415
    body = {
        "subject": "crop",
        "subject_type": "tomato",
        "image_keys": [upload.json()["key"]],
        "client_id": str(uuid4()),
    }
    denied = await account_clients.other.post("/api/v1/scans", json=body)
    assert denied.status_code == 422
    created = await owner.post("/api/v1/scans", json=body)
    assert created.status_code == 202
    retry = await owner.post("/api/v1/scans", json=body)
    assert retry.json() == created.json()
    url = f"/api/v1/scans/{created.json()['id']}"
    result = await owner.get(url)
    assert result.status_code == 200
    assert result.json()["subject_type"] == "tomato"
    assert result.json()["status"] == "done"
    assert (await account_clients.other.get(url)).status_code == 404
    saved = await owner.get("/api/v1/scans")
    assert [scan["id"] for scan in saved.json()] == [created.json()["id"]]


async def test_failed_analysis_leaves_a_retrievable_scan(
    account_clients: AccountClients, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.providers.ai.gemini.get_settings", lambda: Settings(_env_file=None, gemini_api_key="")
    )
    owner = account_clients.owner
    user = UUID((await owner.get("/api/v1/me")).json()["id"])
    response = await owner.post(
        "/api/v1/scans",
        json={
            "subject": "hive",
            "image_keys": [f"scans/{user}/{uuid4().hex}.webp"],
            "client_id": str(uuid4()),
        },
    )
    assert response.status_code == 202
    assert response.json()["status"] == "failed"
    scan = await owner.get(f"/api/v1/scans/{response.json()['id']}")
    assert scan.status_code == 200
    assert scan.json()["result"] is None
