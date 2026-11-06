from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError
from app.modules.users.models import ChatProfile, User
from app.modules.users.schemas import ProfilePatch, ProfileResponse, UserPatch, UserResponse


async def update_user(
    session: AsyncSession, user_id: UUID, data: UserPatch, settings: Settings
) -> UserResponse:
    if data.locale not in {locale.strip() for locale in settings.supported_locales.split(",")}:
        raise AppError(
            status_code=422, code="unsupported_locale", message="Choose a supported language."
        )
    user = await session.get(User, user_id)
    assert user is not None  # require_current_user holds this row until commit.
    user.locale = data.locale
    await session.flush()
    await session.refresh(user)
    response = UserResponse.model_validate(user)
    await session.commit()
    return response


async def get_profile(session: AsyncSession, user_id: UUID) -> ProfileResponse:
    profile = await session.get(ChatProfile, user_id)
    if profile is None:
        raise AppError(
            status_code=404,
            code="profile_not_found",
            message="Add your farmer profile to continue.",
        )
    return ProfileResponse.model_validate(profile)


async def update_profile(
    session: AsyncSession, user_id: UUID, data: ProfilePatch
) -> ProfileResponse:
    profile = await session.scalar(select(ChatProfile).where(ChatProfile.user_id == user_id))
    if profile is None:
        if not data.display_name:
            raise AppError(
                status_code=422, code="display_name_required", message="Enter your display name."
            )
        profile = ChatProfile(user_id=user_id, display_name=data.display_name)
        session.add(profile)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    if profile.area_lga and not profile.area_state:
        raise AppError(
            status_code=422, code="profile_area_invalid", message="Choose a state for your LGA."
        )
    await session.flush()
    await session.refresh(profile)
    response = ProfileResponse.model_validate(profile)
    await session.commit()
    return response
