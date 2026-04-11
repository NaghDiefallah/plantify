from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

UserRole = Literal["farmer", "expert", "admin", "developer"]


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    avatar_url: str | None = None
    bio: str | None = None
    role: UserRole
    region_label: str
    private_feed_enabled: bool
    is_community_moderator: bool
    is_verified: bool
    badges: list[str] = Field(default_factory=list)
    green_thumb_karma: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCommunitySettingsUpdateRequest(BaseModel):
    region_label: str | None = None
    private_feed_enabled: bool | None = None


class UserProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    region_label: str | None = None


class UserRecognitionUpdateRequest(BaseModel):
    badges: list[str] | None = None
    is_verified: bool | None = None


class UserRoleUpdateRequest(BaseModel):
    role: UserRole


class RoleCodeUpdateRequest(BaseModel):
    code: str
    role: UserRole
