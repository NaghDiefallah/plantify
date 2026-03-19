from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.db.session import get_session
from app.models.user import User
from app.schemas.user import RoleCodeUpdateRequest, UserResponse, UserRoleUpdateRequest

router = APIRouter(prefix="/users", tags=["users"])

ROLE_ELEVATION_CODE = "q*$e3P$NbB7JuUuDg"


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.get("", response_model=list[UserResponse])
async def list_users(
    _: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> list[UserResponse]:
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [UserResponse.model_validate(user) for user in users]


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    _: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.role = payload.role
    await session.commit()
    await session.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/self/role/by-code", response_model=UserResponse)
async def update_own_role_by_code(
    payload: RoleCodeUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    if payload.code != ROLE_ELEVATION_CODE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid authorization code")

    current_user.role = payload.role
    await session.commit()
    await session.refresh(current_user)
    return UserResponse.model_validate(current_user)
