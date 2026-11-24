"""Scan router."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_session
from app.modules.assistant.schemas import AnswerResult, QuestionRequest
from app.modules.assistant.service import AssistantService
from app.modules.auth.service import get_current_user_id
from app.modules.scans.schemas import ScanDetail, ScanPhotoResponse, ScanRequest, ScanResponse
from app.modules.scans.service import ScanService
from app.providers.ai import GeminiProvider
from app.providers.storage.scan_images import InvalidScanPhoto, ScanPhotoStorage, owns_scan_photo

router = APIRouter(prefix="/scans", tags=["scans"])


def get_scan_service() -> ScanService:
    return ScanService(GeminiProvider())


def get_assistant_service() -> AssistantService:
    return AssistantService(GeminiProvider())


@router.post(
    "/photos",
    response_model=ScanPhotoResponse,
    status_code=status.HTTP_201_CREATED,
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/octet-stream": {"schema": {"type": "string", "format": "binary"}}
            },
        }
    },
)
async def upload_scan_photo(
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
    storage: ScanPhotoStorage = Depends(ScanPhotoStorage),
) -> ScanPhotoResponse:
    photo = bytearray()
    async for chunk in request.stream():
        if len(photo) + len(chunk) > get_settings().scan_photo_limit_bytes:
            raise HTTPException(status_code=413, detail="Photo is too large")
        photo.extend(chunk)
    try:
        return ScanPhotoResponse(key=await storage.save(user_id, bytes(photo)))
    except InvalidScanPhoto as exc:
        raise HTTPException(status_code=415, detail="Unsupported photo") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Photo storage unavailable") from exc


@router.post("", response_model=ScanResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_scan(
    req: ScanRequest,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    service: ScanService = Depends(get_scan_service),
) -> ScanResponse:
    """Create a new scan job."""
    try:
        return await service.create_scan(db, user_id, req)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


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
    limit: int = Query(50, ge=1, le=100),
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
        scan_context = "\n\nSCAN CONTEXT:\n"
        scan_context += f"- Subject: {scan.subject}"
        if scan.subject_type:
            scan_context += f" ({scan.subject_type})"
        scan_context += f"\n- Overall confidence: {result.get('overall_confidence', 'unknown')}"
        if result.get("likely_causes"):
            causes = [
                f"{cause['name']} ({cause['confidence']} confidence)"
                for cause in result["likely_causes"]
            ]
            scan_context += f"\n- Likely causes: {', '.join(causes)}"
        if result.get("observations"):
            scan_context += f"\n- Observations: {'; '.join(result['observations'])}"
        if result.get("next_steps"):
            scan_context += f"\n- Recommended next steps: {'; '.join(result['next_steps'])}"

    if (
        len(req.text) > 4000
        or len(req.image_keys or []) > 5
        or not all(owns_scan_photo(user_id, key) for key in req.image_keys or [])
    ):
        raise HTTPException(status_code=422, detail="Invalid follow-up")
    farm_id = req.farm_id or scan.farm_id
    unit_id = req.unit_id or scan.unit_id
    try:
        await scan_service.validate_farm(db, user_id, farm_id, unit_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    enhanced_req = QuestionRequest(
        text=f"{req.text}{scan_context}",
        farm_id=farm_id,
        unit_id=unit_id,
        image_keys=req.image_keys,
        thread_id=req.thread_id,
    )

    try:
        answer = await assistant_service.send_message(db, req.thread_id, user_id, enhanced_req)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Thread not found") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Photo guidance unavailable") from exc
    await db.commit()
    return answer
