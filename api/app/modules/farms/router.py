from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import ErrorResponse
from app.db.session import get_session
from app.modules.auth.service import require_current_user
from app.modules.farms import service, unit_service
from app.modules.farms.schemas import (
    FarmCreate,
    FarmPage,
    FarmPatch,
    FarmResponse,
    UnitCreate,
    UnitPage,
    UnitPatch,
    UnitResponse,
)
from app.modules.users.schemas import UserResponse

router = APIRouter(
    tags=["farms"],
    responses={
        401: {"model": ErrorResponse, "description": "Sign-in required"},
        403: {"model": ErrorResponse, "description": "Account inactive"},
        404: {"model": ErrorResponse, "description": "Farm or unit not found"},
        409: {"model": ErrorResponse, "description": "Account setup, farm limit or unit conflict"},
        422: {"model": ErrorResponse, "description": "Invalid farm or unit details"},
        503: {"model": ErrorResponse, "description": "Service temporarily unavailable"},
    },
)
CurrentUser = Annotated[UserResponse, Depends(require_current_user)]
Session = Annotated[AsyncSession, Depends(get_session)]
Config = Annotated[Settings, Depends(get_settings)]
PageLimit = Annotated[int | None, Query(ge=1)]


@router.get("/farms", response_model=FarmPage, summary="List your farms")
async def list_farms(
    user: CurrentUser,
    session: Session,
    settings: Config,
    cursor: UUID | None = None,
    limit: PageLimit = None,
) -> FarmPage:
    return await service.list_farms(session, user.id, cursor, service.page_size(limit, settings))


@router.post("/farms", response_model=FarmResponse, status_code=201, summary="Add a farm")
async def create_farm(
    data: FarmCreate, user: CurrentUser, session: Session, settings: Config
) -> FarmResponse:
    return await service.create_farm(session, user.id, data, settings)


@router.get("/farms/{farm_id}", response_model=FarmResponse, summary="Read your farm")
async def get_farm(farm_id: UUID, user: CurrentUser, session: Session) -> FarmResponse:
    return await service.get_farm(session, user.id, farm_id)


@router.patch("/farms/{farm_id}", response_model=FarmResponse, summary="Edit your farm")
async def update_farm(
    farm_id: UUID, data: FarmPatch, user: CurrentUser, session: Session
) -> FarmResponse:
    return await service.update_farm(session, user.id, farm_id, data)


@router.delete("/farms/{farm_id}", status_code=204, summary="Remove your farm and its units")
async def delete_farm(farm_id: UUID, user: CurrentUser, session: Session) -> Response:
    await service.delete_farm(session, user.id, farm_id)
    return Response(status_code=204)


@router.get("/farms/{farm_id}/units", response_model=UnitPage, summary="List your farm's units")
async def list_units(
    farm_id: UUID,
    user: CurrentUser,
    session: Session,
    settings: Config,
    cursor: UUID | None = None,
    limit: PageLimit = None,
) -> UnitPage:
    return await unit_service.list_units(
        session, user.id, farm_id, cursor, service.page_size(limit, settings)
    )


@router.post(
    "/farms/{farm_id}/units",
    response_model=UnitResponse,
    status_code=201,
    summary="Add a hive or crop block",
)
async def create_unit(
    farm_id: UUID, data: UnitCreate, user: CurrentUser, session: Session, settings: Config
) -> UnitResponse:
    return await unit_service.create_unit(session, user.id, farm_id, data, settings)


@router.patch("/units/{unit_id}", response_model=UnitResponse, summary="Edit a hive or crop block")
async def update_unit(
    unit_id: UUID, data: UnitPatch, user: CurrentUser, session: Session
) -> UnitResponse:
    return await unit_service.update_unit(session, user.id, unit_id, data)


@router.delete("/units/{unit_id}", status_code=204, summary="Remove a hive or crop block")
async def delete_unit(unit_id: UUID, user: CurrentUser, session: Session) -> Response:
    await unit_service.delete_unit(session, user.id, unit_id)
    return Response(status_code=204)
