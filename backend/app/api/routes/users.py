import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.audit import audit_event
from app.core.config import get_settings
from app.db.session import get_session
from app.models.user import User
from app.schemas.user import (
    RoleCodeUpdateRequest,
    UserCommunitySettingsUpdateRequest,
    UserProfileUpdateRequest,
    UserRecognitionUpdateRequest,
    UserResponse,
    UserRoleUpdateRequest,
)

router = APIRouter(prefix="/users", tags=["users"])

settings = get_settings()


def _parse_badges(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(item).strip() for item in parsed if str(item).strip()]


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        role=user.role,
        region_label=user.region_label,
        private_feed_enabled=user.private_feed_enabled,
        is_community_moderator=user.is_community_moderator,
        is_verified=user.is_verified,
        badges=_parse_badges(user.badges_json),
        green_thumb_karma=user.green_thumb_karma,
        created_at=user.created_at,
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return _user_response(current_user)


@router.get("/{user_id}/profile", response_model=UserResponse)
async def get_user_profile(
    user_id: str,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
) -> UserResponse:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _user_response(user)


@router.get("", response_model=list[UserResponse])
async def list_users(
    _: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> list[UserResponse]:
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [_user_response(user) for user in users]


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    request: Request,
    current_user: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.role = payload.role
    await session.commit()
    await session.refresh(user)
    audit_event(
        event="users.role_update",
        outcome="success",
        request=request,
        user_id=current_user.id,
        target_user_id=user.id,
        target_role=user.role,
    )
    return _user_response(user)


@router.post("/self/role/by-code", response_model=UserResponse)
async def update_own_role_by_code(
    payload: RoleCodeUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    role_elevation_code = settings.role_elevation_code.strip()
    if not role_elevation_code:
        audit_event(
            event="users.role_elevation",
            outcome="denied",
            request=request,
            user_id=current_user.id,
            reason="role_elevation_disabled",
        )
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Role elevation is disabled")

    if payload.code != role_elevation_code:
        audit_event(
            event="users.role_elevation",
            outcome="denied",
            request=request,
            user_id=current_user.id,
            reason="invalid_code",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid authorization code")

    current_user.role = payload.role
    await session.commit()
    await session.refresh(current_user)
    audit_event(
        event="users.role_elevation",
        outcome="success",
        request=request,
        user_id=current_user.id,
    )
    return _user_response(current_user)


@router.patch("/me/community-settings", response_model=UserResponse)
async def update_my_community_settings(
    payload: UserCommunitySettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    if payload.region_label is not None:
        current_user.region_label = payload.region_label
    if payload.private_feed_enabled is not None:
        current_user.private_feed_enabled = payload.private_feed_enabled

    await session.commit()
    await session.refresh(current_user)
    return _user_response(current_user)


@router.patch("/me/profile", response_model=UserResponse)
async def update_my_profile(
    payload: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip() or current_user.full_name
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url or None
    if payload.bio is not None:
        current_user.bio = payload.bio.strip() or None
    if payload.region_label is not None:
        current_user.region_label = payload.region_label.strip() or current_user.region_label

    await session.commit()
    await session.refresh(current_user)
    return _user_response(current_user)


@router.patch("/{user_id}/recognition", response_model=UserResponse)
async def update_user_recognition(
    user_id: str,
    payload: UserRecognitionUpdateRequest,
    request: Request,
    current_user: User = Depends(require_roles("expert", "admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.badges is not None:
        user.badges_json = json.dumps([badge.strip() for badge in payload.badges if badge.strip()])

    if payload.is_verified is not None:
        if current_user.role not in {"admin", "developer"}:
            audit_event(
                event="users.verification_update",
                outcome="denied",
                request=request,
                user_id=current_user.id,
                target_user_id=user_id,
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can update verification")
        user.is_verified = payload.is_verified

    await session.commit()
    await session.refresh(user)
    audit_event(
        event="users.recognition_update",
        outcome="success",
        request=request,
        user_id=current_user.id,
        target_user_id=user.id,
    )
    return _user_response(user)
