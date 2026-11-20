"""Briefing router."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.service import get_current_user_id
from app.modules.briefings.schemas import BriefingResponse
from app.modules.briefings.service import BriefingService
from app.providers.ai import MockAIProvider

router = APIRouter(prefix="/briefings", tags=["briefings"])


def get_briefing_service() -> BriefingService:
    """Get briefing service with mock AI provider."""
    return BriefingService(MockAIProvider())


@router.get("/daily", response_model=BriefingResponse)
async def get_daily_briefing(
    farm_id: UUID = Query(...),
    local_date: date | None = None,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    service: BriefingService = Depends(get_briefing_service),
) -> BriefingResponse:
    """Get or generate a daily briefing for a farm."""
    if local_date is None:
        local_date = date.today()
    try:
        return await service.get_or_generate_briefing(db, user_id, farm_id, local_date)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("", response_model=list[BriefingResponse])
async def list_briefings(
    farm_id: UUID | None = None,
    cursor: UUID | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    service: BriefingService = Depends(get_briefing_service),
) -> list[BriefingResponse]:
    """List briefings for the current user."""
    briefings = await service.list_briefings(db, user_id, farm_id, cursor, limit)
    return [BriefingResponse.model_validate(b) for b in briefings]
