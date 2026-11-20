"""Assistant router."""

from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.modules.assistant.schemas import (
    AnswerResult,
    MessageCreate,
    MessageResponse,
    QuestionRequest,
    ThreadCreate,
    ThreadResponse,
)
from app.modules.assistant.service import AssistantService
from app.modules.auth.service import get_current_user_id
from app.providers.ai import MockAIProvider

router = APIRouter(prefix="/assistant", tags=["assistant"])


def get_assistant_service() -> AssistantService:
    """Get assistant service with mock AI provider."""
    return AssistantService(MockAIProvider())


@router.post("/threads", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED)
async def create_thread(
    req: ThreadCreate,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    service: AssistantService = Depends(get_assistant_service),
) -> ThreadResponse:
    """Create a new assistant thread."""
    return await service.create_thread(db, user_id, req)


@router.get("/threads", response_model=list[ThreadResponse])
async def list_threads(
    cursor: UUID | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    service: AssistantService = Depends(get_assistant_service),
) -> list[ThreadResponse]:
    """List assistant threads for the current user."""
    threads = await service.list_threads(db, user_id, cursor, limit)
    return [ThreadResponse.model_validate(t) for t in threads]


@router.post("/threads/{thread_id}/messages", response_model=AnswerResult)
async def send_message(
    thread_id: UUID,
    req: MessageCreate,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    service: AssistantService = Depends(get_assistant_service),
) -> AnswerResult:
    """Send a message and get an answer."""
    try:
        return await service.send_message(
            db,
            thread_id,
            user_id,
            QuestionRequest(
                text=req.text,
                image_keys=req.image_keys,
                thread_id=thread_id,
            ),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/threads/{thread_id}/messages/stream")
async def stream_message(
    thread_id: UUID,
    req: MessageCreate,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    service: AssistantService = Depends(get_assistant_service),
) -> StreamingResponse:
    """Stream an answer for a message (SSE)."""
    try:

        async def event_generator() -> AsyncIterator[str]:
            async for chunk in service.stream_message(
                db,
                thread_id,
                user_id,
                QuestionRequest(
                    text=req.text,
                    image_keys=req.image_keys,
                    thread_id=thread_id,
                ),
            ):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/messages/{message_id}/feedback", response_model=MessageResponse)
async def submit_feedback(
    message_id: UUID,
    value: str,
    db: AsyncSession = Depends(get_session),
    user_id: UUID = Depends(get_current_user_id),
    service: AssistantService = Depends(get_assistant_service),
) -> MessageResponse:
    """Submit feedback on an assistant message."""
    msg = await service.submit_feedback(db, message_id, user_id, value)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return MessageResponse.model_validate(msg)
