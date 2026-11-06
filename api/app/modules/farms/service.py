from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError
from app.modules.farms.models import Farm, FarmUnit
from app.modules.farms.permissions import owned_farm
from app.modules.farms.schemas import FarmCreate, FarmPage, FarmPatch, FarmResponse


def page_size(limit: int | None, settings: Settings) -> int:
    value = min(settings.page_size, settings.max_page_size) if limit is None else limit
    if not 1 <= value <= settings.max_page_size:
        raise AppError(
            status_code=422, code="invalid_page_size", message="Choose a smaller page size."
        )
    return value


async def list_farms(
    session: AsyncSession, user_id: UUID, cursor: UUID | None, limit: int
) -> FarmPage:
    query = select(Farm).where(Farm.user_id == user_id).order_by(Farm.id).limit(limit + 1)
    if cursor is not None:
        query = query.where(Farm.id > cursor)
    farms = list((await session.scalars(query)).all())
    return FarmPage(
        items=[FarmResponse.model_validate(farm) for farm in farms[:limit]],
        next_cursor=farms[limit - 1].id if len(farms) > limit else None,
    )


async def create_farm(
    session: AsyncSession, user_id: UUID, data: FarmCreate, settings: Settings
) -> FarmResponse:
    existing = await session.scalar(
        select(Farm).where(Farm.user_id == user_id, Farm.client_id == data.client_id)
    )
    if existing is not None:
        return FarmResponse.model_validate(existing)
    count = await session.scalar(
        select(func.count()).select_from(Farm).where(Farm.user_id == user_id)
    )
    if count is not None and count >= settings.max_farms_per_user:
        raise AppError(
            status_code=409, code="farm_limit_reached", message="Your farm limit is reached."
        )
    farm = Farm(user_id=user_id, **data.model_dump())
    session.add(farm)
    await session.flush()
    response = FarmResponse.model_validate(farm)
    await session.commit()
    return response


async def get_farm(session: AsyncSession, user_id: UUID, farm_id: UUID) -> FarmResponse:
    return FarmResponse.model_validate(await owned_farm(session, user_id, farm_id))


async def update_farm(
    session: AsyncSession, user_id: UUID, farm_id: UUID, data: FarmPatch
) -> FarmResponse:
    farm = await owned_farm(session, user_id, farm_id)
    current = FarmCreate.model_validate(farm, from_attributes=True).model_dump()
    try:
        changed = FarmCreate.model_validate(current | data.model_dump(exclude_unset=True))
    except ValidationError as exc:
        raise AppError(
            status_code=422, code="farm_details_invalid", message="Check the farm location details."
        ) from exc
    if changed.kind != farm.kind and changed.kind != "both":
        allowed_kind = "hive" if changed.kind == "bees" else "crop_block"
        incompatible = await session.scalar(
            select(FarmUnit.id)
            .where(FarmUnit.farm_id == farm.id, FarmUnit.kind != allowed_kind)
            .limit(1)
        )
        if incompatible is not None:
            raise AppError(
                status_code=409,
                code="farm_kind_conflict",
                message="Remove incompatible farm units before changing the farm type.",
            )
    for field, value in changed.model_dump(exclude={"client_id"}).items():
        setattr(farm, field, value)
    await session.flush()
    await session.refresh(farm)
    response = FarmResponse.model_validate(farm)
    await session.commit()
    return response


async def delete_farm(session: AsyncSession, user_id: UUID, farm_id: UUID) -> None:
    farm = await owned_farm(session, user_id, farm_id)
    await session.delete(farm)
    await session.commit()


async def delete_owned_farms(session: AsyncSession, user_id: UUID) -> None:
    """Participate in account deletion's transaction; units cascade with farms."""
    await session.execute(delete(Farm).where(Farm.user_id == user_id))
