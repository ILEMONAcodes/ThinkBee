"""Assistant thread and message service."""

import logging
from collections.abc import AsyncIterator
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AssistantMessage, AssistantThread
from app.modules.assistant.schemas import (
    AnswerResult,
    QuestionRequest,
    ThreadCreate,
    ThreadResponse,
)
from app.providers.ai.base import AIProvider

logger = logging.getLogger(__name__)


class AssistantService:
    """Service for handling assistant threads and messages."""

    def __init__(self, ai_provider: AIProvider) -> None:
        self.ai_provider = ai_provider

    async def create_thread(
        self,
        db: AsyncSession,
        user_id: UUID,
        req: ThreadCreate,
    ) -> ThreadResponse:
        """Create a new assistant thread."""
        thread = AssistantThread(
            id=uuid4(),
            user_id=user_id,
            farm_id=req.farm_id,
            unit_id=req.unit_id,
        )
        db.add(thread)
        await db.flush()
        await db.refresh(thread)
        return ThreadResponse.model_validate(thread)

    async def get_thread(
        self,
        db: AsyncSession,
        thread_id: UUID,
        user_id: UUID,
    ) -> AssistantThread | None:
        """Get a thread by ID."""
        result = await db.execute(
            select(AssistantThread).where(
                AssistantThread.id == thread_id, AssistantThread.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def list_threads(
        self,
        db: AsyncSession,
        user_id: UUID,
        cursor: UUID | None = None,
        limit: int = 50,
    ) -> list[AssistantThread]:
        """List threads for a user."""
        query = (
            select(AssistantThread)
            .where(AssistantThread.user_id == user_id)
            .order_by(AssistantThread.id)
        )
        if cursor:
            query = query.where(AssistantThread.id > cursor)
        query = query.limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def send_message(
        self,
        db: AsyncSession,
        thread_id: UUID | None,
        user_id: UUID,
        req: QuestionRequest,
    ) -> AnswerResult:
        """Send a message and get an answer."""
        # If thread_id provided, verify ownership
        if thread_id is not None:
            thread = await self.get_thread(db, thread_id, user_id)
            if not thread:
                raise ValueError("Thread not found")
        else:
            # Create a temporary thread for this conversation
            thread = AssistantThread(
                id=uuid4(),
                user_id=user_id,
                farm_id=req.farm_id,
                unit_id=req.unit_id,
            )
            db.add(thread)
            await db.flush()

        # Save user message
        user_msg = AssistantMessage(
            id=uuid4(),
            thread_id=thread.id,
            role="user",
            body=req.text,
            attachments=req.image_keys,
        )
        db.add(user_msg)

        # Get AI answer
        result = await self.ai_provider.answer_question(req)

        # Save assistant message
        asst_msg = AssistantMessage(
            id=uuid4(),
            thread_id=thread.id,
            role="assistant",
            body=result.answer,
            attachments=req.image_keys,
            safety={
                "warnings": result.warnings,
                "confidence": result.confidence,
                "context_used": result.context_used,
            },
        )
        db.add(asst_msg)

        await db.flush()
        return result

    async def stream_message(
        self,
        db: AsyncSession,
        thread_id: UUID | None,
        user_id: UUID,
        req: QuestionRequest,
    ) -> AsyncIterator[str]:
        """Stream an answer for a message."""
        # If thread_id provided, verify ownership
        if thread_id is not None:
            thread = await self.get_thread(db, thread_id, user_id)
            if not thread:
                raise ValueError("Thread not found")
        else:
            # Create a temporary thread for this conversation
            thread = AssistantThread(
                id=uuid4(),
                user_id=user_id,
                farm_id=req.farm_id,
                unit_id=req.unit_id,
            )
            db.add(thread)
            await db.flush()

        # Save user message
        user_msg = AssistantMessage(
            id=uuid4(),
            thread_id=thread.id,
            role="user",
            body=req.text,
            attachments=req.image_keys,
        )
        db.add(user_msg)
        await db.flush()

        # Stream answer
        async for chunk in self.ai_provider.stream_answer(req):
            yield chunk

    async def submit_feedback(
        self,
        db: AsyncSession,
        message_id: UUID,
        user_id: UUID,
        feedback: str,
    ) -> AssistantMessage | None:
        """Submit feedback on an assistant message."""
        result = await db.execute(
            select(AssistantMessage)
            .join(AssistantThread)
            .where(AssistantMessage.id == message_id, AssistantThread.user_id == user_id)
        )
        msg = result.scalar_one_or_none()
        if msg and msg.role == "assistant":
            msg.feedback = feedback
            await db.flush()
        return msg
