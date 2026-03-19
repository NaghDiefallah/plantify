from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr

UserRole = Literal["farmer", "expert", "admin", "developer"]


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class UserRoleUpdateRequest(BaseModel):
    role: UserRole


class RoleCodeUpdateRequest(BaseModel):
    code: str
    role: UserRole
