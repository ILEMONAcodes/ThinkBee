"""Daily briefing service."""

import logging
from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import DailyBriefing
from app.modules.briefings.schemas import BriefingRequest, BriefingResponse, BriefingResult
from app.modules.farms.models import Farm
from app.providers.ai.base import AIProvider

logger = logging.getLogger(__name__)


class BriefingService:
    """Service for handling daily briefings."""

    def __init__(self, ai_provider: AIProvider) -> None:
        self.ai_provider = ai_provider

    async def get_or_generate_briefing(
        self,
        db: AsyncSession,
        user_id: UUID,
        farm_id: UUID,
        local_date: date,
    ) -> BriefingResponse:
        """Get existing briefing or generate a new one."""
        # Check if briefing exists
        result = await db.execute(
            select(DailyBriefing).where(
                DailyBriefing.user_id == user_id,
                DailyBriefing.farm_id == farm_id,
                DailyBriefing.local_date == local_date,
            )
        )
        briefing = result.scalar_one_or_none()

        if briefing:
            return BriefingResponse.model_validate(briefing)

        # Verify farm ownership
        farm_result = await db.execute(
            select(Farm).where(Farm.id == farm_id, Farm.user_id == user_id)
        )
        farm = farm_result.scalar_one_or_none()
        if not farm:
            raise ValueError("Farm not found")

        # Generate new briefing
        req = BriefingRequest(farm_id=farm_id, local_date=local_date)
        result_data = await self._generate_briefing(db, user_id, farm, req)

        # Save briefing
        briefing = DailyBriefing(
            id=uuid4(),
            user_id=user_id,
            farm_id=farm_id,
            local_date=local_date,
            status=result_data.status,
            content=result_data.model_dump(mode="json"),
            prompt_version="1",
            generated_at=datetime.now(UTC),
        )
        db.add(briefing)
        await db.flush()
        await db.refresh(briefing)

        return BriefingResponse.model_validate(briefing)

    async def _generate_briefing(
        self,
        db: AsyncSession,
        user_id: UUID,
        farm: Farm,
        req: BriefingRequest,
    ) -> BriefingResult:
        """Generate a briefing using the AI provider."""
        # In a full implementation, this would build context from farm, weather, history
        return await self.ai_provider.generate_daily_briefing(req)

    async def list_briefings(
        self,
        db: AsyncSession,
        user_id: UUID,
        farm_id: UUID | None = None,
        cursor: UUID | None = None,
        limit: int = 50,
    ) -> list[DailyBriefing]:
        """List briefings for a user."""
        query = select(DailyBriefing).where(DailyBriefing.user_id == user_id)
        if farm_id:
            query = query.where(DailyBriefing.farm_id == farm_id)
        query = query.order_by(DailyBriefing.local_date.desc())
        if cursor:
            query = query.where(DailyBriefing.id > cursor)
        query = query.limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())
