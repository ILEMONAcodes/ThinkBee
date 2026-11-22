"""Scan router."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.auth.service import get_current_user_id
from app.modules.scans.schemas import ScanDetail, ScanRequest, ScanResponse
from app.modules.scans.service import ScanService
from app.modules.assistant.schemas import QuestionRequest, AnswerResult
from app.modules.assistant.service import AssistantService
from app.providers.ai import MockAIProvider

router = APIRouter(prefix="/scans", tags=["scans"])


def get_scan_service() -> ScanService:
    """Get scan service with mock AI provider."""
    return ScanService(MockAIProvider())


def get_assistant_service() -> AssistantService:
    """Get assistant service with mock AI provider."""
    return AssistantService(MockAIProvider())


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


@router.post("/{scan_id}/chat", response_model=AnswerResult)
async def chat_about_scan(
    scan_id: UUID,
    req: QuestionRequest,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    scan_service: ScanService = Depends(get_scan_service),
    assistant_service: AssistantService = Depends(get_assistant_service),
) -> AnswerResult:
    """Chat with AI about a specific scan result."""
    scan = await scan_service.get_scan(db, scan_id, user_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Enhance the question with scan context
    scan_context = ""
    if scan.result:
        result = scan.result
        scan_context = f"\n\nSCAN CONTEXT:\n"
        scan_context += f"- Subject: {scan.subject}"
        if scan.subject_type:
            scan_context += f" ({scan.subject_type})"
        scan_context += f"\n- Overall confidence: {result.get('overall_confidence', 'unknown')}"
        if result.get('likely_causes'):
            causes = [f"{c['name']} ({c['confidence']} confidence)" for c in result['likely_causes']]
            scan_context += f"\n- Likely causes: {', '.join(causes)}"
        if result.get('observations'):
            scan_context += f"\n- Observations: {'; '.join(result['observations'])}"
        if result.get('next_steps'):
            scan_context += f"\n- Recommended next steps: {'; '.join(result['next_steps'])}"

    enhanced_req = QuestionRequest(
        text=f"{req.text}{scan_context}",
        farm_id=req.farm_id or scan.farm_id,
        unit_id=req.unit_id or scan.unit_id,
        image_keys=req.image_keys,
        thread_id=req.thread_id,
    )

    try:
        return await assistant_service.send_message(db, None, user_id, enhanced_req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
