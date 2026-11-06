from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError
from app.modules.farms.models import FarmUnit
from app.modules.farms.permissions import owned_farm, owned_unit
from app.modules.farms.schemas import UnitCreate, UnitPage, UnitPatch, UnitResponse


async def list_units(
    session: AsyncSession, user_id: UUID, farm_id: UUID, cursor: UUID | None, limit: int
) -> UnitPage:
    await owned_farm(session, user_id, farm_id)
    query = (
        select(FarmUnit).where(FarmUnit.farm_id == farm_id).order_by(FarmUnit.id).limit(limit + 1)
    )
    if cursor is not None:
        query = query.where(FarmUnit.id > cursor)
    units = list((await session.scalars(query)).all())
    return UnitPage(
        items=[UnitResponse.model_validate(unit) for unit in units[:limit]],
        next_cursor=units[limit - 1].id if len(units) > limit else None,
    )


async def create_unit(
    session: AsyncSession, user_id: UUID, farm_id: UUID, data: UnitCreate, settings: Settings
) -> UnitResponse:
    farm = await owned_farm(session, user_id, farm_id)
    existing = await session.scalar(
        select(FarmUnit).where(FarmUnit.farm_id == farm_id, FarmUnit.client_id == data.client_id)
    )
    if existing is not None:
        return UnitResponse.model_validate(existing)
    allowed_farm_kind = "bees" if data.kind == "hive" else "crops"
    if farm.kind not in {"both", allowed_farm_kind}:
        raise AppError(
            status_code=422,
            code="unit_kind_invalid",
            message="Choose a unit that matches this farm.",
        )
    count = await session.scalar(
        select(func.count()).select_from(FarmUnit).where(FarmUnit.farm_id == farm_id)
    )
    if count is not None and count >= settings.max_units_per_farm:
        raise AppError(
            status_code=409, code="unit_limit_reached", message="This farm's unit limit is reached."
        )
    unit = FarmUnit(farm_id=farm_id, **data.model_dump())
    session.add(unit)
    await session.flush()
    response = UnitResponse.model_validate(unit)
    await session.commit()
    return response


async def update_unit(
    session: AsyncSession, user_id: UUID, unit_id: UUID, data: UnitPatch
) -> UnitResponse:
    unit = await owned_unit(session, user_id, unit_id)
    current = UnitCreate.model_validate(unit, from_attributes=True).model_dump()
    try:
        changed = UnitCreate.model_validate(current | data.model_dump(exclude_unset=True))
    except ValidationError as exc:
        raise AppError(
            status_code=422, code="unit_details_invalid", message="Check the details for this unit."
        ) from exc
    unit.name = changed.name
    unit.details = changed.details.model_dump()
    await session.flush()
    await session.refresh(unit)
    response = UnitResponse.model_validate(unit)
    await session.commit()
    return response


async def delete_unit(session: AsyncSession, user_id: UUID, unit_id: UUID) -> None:
    unit = await owned_unit(session, user_id, unit_id)
    await session.delete(unit)
    await session.commit()
