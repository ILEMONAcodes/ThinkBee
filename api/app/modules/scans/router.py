"""Scan router."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.service import get_current_user_id
from app.modules.scans.schemas import ScanDetail, ScanRequest, ScanResponse
from app.modules.scans.service import ScanService
from app.providers.ai import MockAIProvider

router = APIRouter(prefix="/scans", tags=["scans"])


def get_scan_service() -> ScanService:
    """Get scan service with mock AI provider."""
    return ScanService(MockAIProvider())


@router.post("", response_model=ScanResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_scan(
    req: ScanRequest,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    service: ScanService = Depends(get_scan_service),
) -> ScanResponse:
    """Create a new scan job."""
    return await service.create_scan(db, user_id, req)


@router.get("/{scan_id}", response_model=ScanDetail)
async def get_scan(
    scan_id: UUID,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    service: ScanService = Depends(get_scan_service),
) -> ScanDetail:
    """Get a scan by ID."""
    scan = await service.get_scan(db, scan_id, user_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return ScanDetail.model_validate(scan)


@router.get("", response_model=list[ScanDetail])
async def list_scans(
    cursor: UUID | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    service: ScanService = Depends(get_scan_service),
) -> list[ScanDetail]:
    """List scans for the current user."""
    scans = await service.list_scans(db, user_id, cursor, limit)
    return [ScanDetail.model_validate(s) for s in scans]
