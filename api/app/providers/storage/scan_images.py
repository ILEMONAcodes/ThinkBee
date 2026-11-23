"""Private, normalized photos used by scan analysis."""

import asyncio
import re
from io import BytesIO
from uuid import UUID, uuid4

from app.core.config import Settings, get_settings


class InvalidScanPhoto(ValueError):
    """The uploaded bytes are not a supported photo."""


def owns_scan_photo(user_id: UUID, key: str) -> bool:
    return re.fullmatch(rf"scans/{user_id}/[0-9a-f]{{32}}\.webp", key) is not None


class ScanPhotoStorage:
    def _client(self, settings: Settings):  # type: ignore[no-untyped-def]
        import boto3
        from botocore.config import Config

        if not settings.s3_access_key or not settings.s3_secret_key:
            raise RuntimeError("Scan storage is unavailable")
        return boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            region_name=settings.s3_region,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=Config(
                connect_timeout=5,
                read_timeout=8,
                retries={"total_max_attempts": 1},
                s3={"addressing_style": "path"},
            ),
        )

    async def save(self, user_id: UUID, photo: bytes) -> str:
        key = f"scans/{user_id}/{uuid4().hex}.webp"
        await asyncio.to_thread(self._save, key, photo)
        return key

    def _save(self, key: str, photo: bytes) -> None:
        from PIL import Image, ImageOps, UnidentifiedImageError

        try:
            with Image.open(BytesIO(photo), formats=("JPEG", "PNG", "WEBP")) as original:
                if original.width * original.height > 25_000_000 or getattr(
                    original, "is_animated", False
                ):
                    raise InvalidScanPhoto
                image = ImageOps.exif_transpose(original).convert("RGB")
                image.thumbnail((1600, 1600))
                image.info.clear()
                output = BytesIO()
                image.save(output, format="WEBP", quality=82)
        except (OSError, UnidentifiedImageError, Image.DecompressionBombError) as exc:
            raise InvalidScanPhoto from exc
        self._put(key, output.getvalue())

    def _put(self, key: str, photo: bytes) -> None:
        with self._client(get_settings()) as client:
            client.put_object(
                Bucket=get_settings().s3_bucket,
                Key=key,
                Body=photo,
                ContentType="image/webp",
            )

    async def read(self, key: str) -> bytes:
        return await asyncio.to_thread(self._read, key)

    def _read(self, key: str) -> bytes:
        with self._client(get_settings()) as client:
            result = client.get_object(Bucket=get_settings().s3_bucket, Key=key)
            with result["Body"] as body:
                photo: bytes = body.read(2_000_001)
            if result["ContentType"] != "image/webp" or len(photo) > 2_000_000:
                raise InvalidScanPhoto
            return photo

    async def purge_account(self, user_id: UUID, settings: Settings) -> None:
        if not settings.s3_access_key and not settings.s3_secret_key:
            return
        await asyncio.to_thread(self._purge_account, user_id, settings)

    def _purge_account(self, user_id: UUID, settings: Settings) -> None:
        with self._client(settings) as client:
            pages = client.get_paginator("list_objects_v2").paginate(
                Bucket=settings.s3_bucket, Prefix=f"scans/{user_id}/"
            )
            for page in pages:
                keys = [{"Key": item["Key"]} for item in page.get("Contents", [])]
                if keys:
                    result = client.delete_objects(
                        Bucket=settings.s3_bucket, Delete={"Objects": keys, "Quiet": True}
                    )
                    if result.get("Errors"):
                        raise RuntimeError("Could not remove scan photos")
