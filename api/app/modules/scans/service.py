"""Scan processing service."""

import asyncio
import logging
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models import Scan, ScanImage
from app.modules.farms.models import Farm, FarmUnit
from app.modules.scans.schemas import ScanRequest, ScanResponse
from app.providers.ai.base import AIProvider
from app.providers.ai.gemini import PROMPT_VERSION
from app.providers.storage.scan_images import owns_scan_photo

logger = logging.getLogger(__name__)


class ScanService:
    """Service for handling photo and video scans."""

    def __init__(self, ai_provider: AIProvider) -> None:
        self.ai_provider = ai_provider

    async def create_scan(
        self,
        db: AsyncSession,
        user_id: UUID,
        req: ScanRequest,
    ) -> ScanResponse:
        """Create a new scan job."""
        existing = await db.scalar(
            select(Scan)
            .where(Scan.user_id == user_id, Scan.client_id == req.client_id)
            .order_by(Scan.created_at)
            .limit(1)
        )
        if existing:
            return ScanResponse.model_validate(existing, from_attributes=True)
        if not all(owns_scan_photo(user_id, key) for key in req.image_keys):
            raise ValueError("Invalid photo reference")
        await self.validate_farm(db, user_id, req.farm_id, req.unit_id)
        scan = Scan(
            id=uuid4(),
            user_id=user_id,
            farm_id=req.farm_id,
            unit_id=req.unit_id,
            subject=req.subject,
            subject_type=req.subject_type,
            status="analysing",
            client_id=req.client_id,
            prompt_version=PROMPT_VERSION,
            model=get_settings().gemini_model,
        )
        db.add(scan)

        # Add scan images/frames
        for i, key in enumerate(req.image_keys):
            db.add(ScanImage(id=uuid4(), scan_id=scan.id, storage_key=key, order=i))

        await db.commit()

        try:
            async with asyncio.timeout(48):
                result = await self.ai_provider.analyze_scan(req)
            scan.status = "failed" if result.status == "unavailable" else "done"
            scan.result = result.model_dump(mode="json") if scan.status == "done" else None
        except Exception as exc:
            logger.warning("Scan analysis failed (%s)", type(exc).__name__)
            scan.status = "failed"

        response = ScanResponse(id=scan.id, status=scan.status)
        await db.commit()
        return response

    @staticmethod
    async def validate_farm(
        db: AsyncSession, user_id: UUID, farm_id: UUID | None, unit_id: UUID | None
    ) -> None:
        if farm_id is not None:
            farm = await db.scalar(
                select(Farm.id).where(Farm.id == farm_id, Farm.user_id == user_id)
            )
            if farm is None:
                raise ValueError("Farm not found")
        if unit_id is not None:
            query = (
                select(FarmUnit.id)
                .join(Farm)
                .where(FarmUnit.id == unit_id, Farm.user_id == user_id)
            )
            if farm_id is not None:
                query = query.where(FarmUnit.farm_id == farm_id)
            if await db.scalar(query) is None:
                raise ValueError("Unit not found")

    async def get_scan(self, db: AsyncSession, scan_id: UUID, user_id: UUID) -> Scan | None:
        """Get a scan by ID."""
        result = await db.execute(select(Scan).where(Scan.id == scan_id, Scan.user_id == user_id))
        return result.scalar_one_or_none()

    async def list_scans(
        self,
        db: AsyncSession,
        user_id: UUID,
        cursor: UUID | None = None,
        limit: int = 50,
    ) -> list[Scan]:
        """List scans for a user."""
        query = select(Scan).where(Scan.user_id == user_id).order_by(Scan.id)
        if cursor:
            query = query.where(Scan.id > cursor)
        query = query.limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())
