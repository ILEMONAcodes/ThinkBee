"""Scan processing service."""

import logging
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models import Scan, ScanImage
from app.modules.scans.schemas import ScanRequest, ScanResponse, ScanResult
from app.providers.ai.base import AIProvider

logger = logging.getLogger(__name__)


class ScanService:
    """Service for handling photo scans."""

    def __init__(self, ai_provider: AIProvider) -> None:
        self.ai_provider = ai_provider

    async def create_scan(
        self,
        db: AsyncSession,
        user_id: UUID,
        req: ScanRequest,
    ) -> ScanResponse:
        """Create a new scan job."""
        scan = Scan(
            id=uuid4(),
            user_id=user_id,
            farm_id=req.farm_id,
            unit_id=req.unit_id,
            subject=req.subject,
            status="queued",
            client_id=req.client_id,
            prompt_version="1",
            model=get_settings().GEMINI_MODEL or "gemini-1.5-flash",
        )
        db.add(scan)

        # Add scan images
        for i, key in enumerate(req.image_keys):
            db.add(ScanImage(id=uuid4(), scan_id=scan.id, storage_key=key, order=i))

        await db.flush()
        await db.refresh(scan)

        # Trigger async analysis (in real implementation, this would be a background job)
        # For now, we'll process synchronously
        try:
            result = await self._analyze_scan(db, scan, req)
            scan.status = "done"
            scan.result = result.model_dump(mode="json")
            await db.flush()
        except Exception as e:
            logger.error(f"Scan analysis failed: {e}")
            scan.status = "failed"
            await db.flush()

        return ScanResponse(id=scan.id, status=scan.status)

    async def _analyze_scan(self, db: AsyncSession, scan: Scan, req: ScanRequest) -> ScanResult:
        """Analyze the scan using the AI provider."""
        # In a full implementation, this would:
        # 1. Build context from farm, weather, history
        # 2. Call AI provider
        # 3. Run post-checks
        # 4. Return validated result
        return await self.ai_provider.analyze_scan(req)

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
