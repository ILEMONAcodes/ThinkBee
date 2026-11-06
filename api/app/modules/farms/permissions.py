from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.modules.farms.models import Farm, FarmUnit


async def owned_farm(session: AsyncSession, user_id: UUID, farm_id: UUID) -> Farm:
    farm = await session.scalar(select(Farm).where(Farm.id == farm_id, Farm.user_id == user_id))
    if farm is None:
        raise AppError(status_code=404, code="farm_not_found", message="This farm was not found.")
    return farm


async def owned_unit(session: AsyncSession, user_id: UUID, unit_id: UUID) -> FarmUnit:
    unit = await session.scalar(
        select(FarmUnit).join(Farm).where(FarmUnit.id == unit_id, Farm.user_id == user_id)
    )
    if unit is None:
        raise AppError(
            status_code=404, code="unit_not_found", message="This farm unit was not found."
        )
    return unit
