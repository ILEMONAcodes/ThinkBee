from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.errors import AppError, app_error_handler, validation_error_handler
from app.modules.auth.router import router as auth_router
from app.modules.farms.router import router as farms_router
from app.modules.users.router import router as users_router


class HealthResponse(BaseModel):
    status: str


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="Think Bee API",
        version="0.1.0",
        docs_url="/docs" if settings.app_env != "production" else None,
        redoc_url=None,
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_exception_handler(AppError, app_error_handler)
    application.add_exception_handler(RequestValidationError, validation_error_handler)
    application.include_router(auth_router, prefix="/api/v1")
    application.include_router(users_router, prefix="/api/v1")
    application.include_router(farms_router, prefix="/api/v1")

    @application.get(
        "/health/live",
        response_model=HealthResponse,
        summary="Check that the API process is running",
    )
    async def health_live() -> HealthResponse:
        return HealthResponse(status="ok")

    @application.get(
        "/health/ready",
        response_model=HealthResponse,
        summary="Check that the API is ready to receive requests",
    )
    async def health_ready() -> HealthResponse:
        return HealthResponse(status="ready")

    return application


app = create_app()
