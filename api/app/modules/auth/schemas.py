from pydantic import BaseModel

from app.modules.users.schemas import UserResponse


class BootstrapResponse(BaseModel):
    user: UserResponse
    is_new: bool
