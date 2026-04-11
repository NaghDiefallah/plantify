"""Add user profile and recognition fields

Revision ID: 20260411_0005
Revises: 20260329_0004
Create Date: 2026-04-11 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260411_0005"
down_revision = "20260329_0004"
branch_labels = None
depends_on = None


def _ensure_column(indexes: set[str], columns: set[str], name: str, column: sa.Column, index_name: str | None = None) -> None:
    if name not in columns:
        op.add_column("users", column)
    if index_name and index_name not in indexes:
        op.create_index(index_name, "users", [name], unique=False)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    user_indexes = {index["name"] for index in inspector.get_indexes("users")}

    _ensure_column(
        user_indexes,
        user_columns,
        "avatar_url",
        sa.Column("avatar_url", sa.String(length=2048), nullable=True),
    )
    _ensure_column(
        user_indexes,
        user_columns,
        "bio",
        sa.Column("bio", sa.Text(), nullable=True),
    )
    _ensure_column(
        user_indexes,
        user_columns,
        "is_verified",
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        op.f("ix_users_is_verified"),
    )
    _ensure_column(
        user_indexes,
        user_columns,
        "badges_json",
        sa.Column("badges_json", sa.Text(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    user_indexes = {index["name"] for index in inspector.get_indexes("users")}

    if op.f("ix_users_is_verified") in user_indexes:
        op.drop_index(op.f("ix_users_is_verified"), table_name="users")

    if "badges_json" in user_columns:
        op.drop_column("users", "badges_json")
    if "is_verified" in user_columns:
        op.drop_column("users", "is_verified")
    if "bio" in user_columns:
        op.drop_column("users", "bio")
    if "avatar_url" in user_columns:
        op.drop_column("users", "avatar_url")
