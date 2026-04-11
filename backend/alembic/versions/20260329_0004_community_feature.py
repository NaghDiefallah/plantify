"""Add community feature schema

Revision ID: 20260329_0004
Revises: 20260328_0003
Create Date: 2026-03-29 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260329_0004"
down_revision = "20260328_0003"
branch_labels = None
depends_on = None


def _ensure_user_column(indexes: set[str], columns: set[str], name: str, column: sa.Column, index_name: str) -> None:
    if name not in columns:
        op.add_column("users", column)
    if index_name not in indexes:
        op.create_index(index_name, "users", [name], unique=False)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    user_indexes = {index["name"] for index in inspector.get_indexes("users")}

    _ensure_user_column(
        user_indexes,
        user_columns,
        "region_label",
        sa.Column("region_label", sa.String(length=120), nullable=False, server_default="Global"),
        op.f("ix_users_region_label"),
    )
    _ensure_user_column(
        user_indexes,
        user_columns,
        "private_feed_enabled",
        sa.Column("private_feed_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        op.f("ix_users_private_feed_enabled"),
    )
    _ensure_user_column(
        user_indexes,
        user_columns,
        "is_community_moderator",
        sa.Column("is_community_moderator", sa.Boolean(), nullable=False, server_default=sa.false()),
        op.f("ix_users_is_community_moderator"),
    )
    _ensure_user_column(
        user_indexes,
        user_columns,
        "green_thumb_karma",
        sa.Column("green_thumb_karma", sa.Integer(), nullable=False, server_default="0"),
        op.f("ix_users_green_thumb_karma"),
    )

    tables = set(inspector.get_table_names())

    if "community_posts" not in tables:
        op.create_table(
            "community_posts",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("title", sa.String(length=180), nullable=False),
            sa.Column("body_markdown", sa.Text(), nullable=False),
            sa.Column("region_label", sa.String(length=120), nullable=False),
            sa.Column("is_private", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("downvotes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("comment_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("bookmark_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("solution_comment_id", sa.String(length=36), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.CheckConstraint("upvotes >= 0", name="ck_community_posts_upvotes_non_negative"),
            sa.CheckConstraint("downvotes >= 0", name="ck_community_posts_downvotes_non_negative"),
            sa.CheckConstraint("comment_count >= 0", name="ck_community_posts_comment_count_non_negative"),
            sa.CheckConstraint("bookmark_count >= 0", name="ck_community_posts_bookmark_count_non_negative"),
        )
        op.create_index(op.f("ix_community_posts_user_id"), "community_posts", ["user_id"], unique=False)
        op.create_index(op.f("ix_community_posts_region_label"), "community_posts", ["region_label"], unique=False)
        op.create_index(op.f("ix_community_posts_is_private"), "community_posts", ["is_private"], unique=False)
        op.create_index(op.f("ix_community_posts_created_at"), "community_posts", ["created_at"], unique=False)
        op.create_index(op.f("ix_community_posts_solution_comment_id"), "community_posts", ["solution_comment_id"], unique=False)
        op.create_index(
            "ix_community_posts_feed_recent",
            "community_posts",
            ["is_private", "region_label", "created_at"],
            unique=False,
        )
        op.create_index(
            "ix_community_posts_feed_hot_support",
            "community_posts",
            ["is_private", "region_label", "upvotes", "downvotes", "created_at"],
            unique=False,
        )

    if "community_post_media" not in tables:
        op.create_table(
            "community_post_media",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("post_id", sa.String(length=36), nullable=False),
            sa.Column("media_type", sa.String(length=16), nullable=False),
            sa.Column("media_url", sa.String(length=512), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.CheckConstraint("media_type IN ('image','video')", name="ck_community_post_media_type"),
            sa.CheckConstraint("position >= 0", name="ck_community_post_media_position_non_negative"),
        )
        op.create_index(op.f("ix_community_post_media_post_id"), "community_post_media", ["post_id"], unique=False)

    if "community_comments" not in tables:
        op.create_table(
            "community_comments",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("post_id", sa.String(length=36), nullable=False),
            sa.Column("parent_id", sa.String(length=36), nullable=True),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("body_markdown", sa.Text(), nullable=False),
            sa.Column("depth", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_solution", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("downvotes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("replies_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["parent_id"], ["community_comments.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.CheckConstraint("depth >= 0", name="ck_community_comments_depth_non_negative"),
            sa.CheckConstraint("upvotes >= 0", name="ck_community_comments_upvotes_non_negative"),
            sa.CheckConstraint("downvotes >= 0", name="ck_community_comments_downvotes_non_negative"),
            sa.CheckConstraint("replies_count >= 0", name="ck_community_comments_replies_non_negative"),
        )
        op.create_index(op.f("ix_community_comments_post_id"), "community_comments", ["post_id"], unique=False)
        op.create_index(op.f("ix_community_comments_parent_id"), "community_comments", ["parent_id"], unique=False)
        op.create_index(op.f("ix_community_comments_user_id"), "community_comments", ["user_id"], unique=False)
        op.create_index(op.f("ix_community_comments_depth"), "community_comments", ["depth"], unique=False)
        op.create_index(op.f("ix_community_comments_is_solution"), "community_comments", ["is_solution"], unique=False)
        op.create_index(op.f("ix_community_comments_created_at"), "community_comments", ["created_at"], unique=False)
        op.create_index(
            "ix_community_comments_thread_lookup",
            "community_comments",
            ["post_id", "parent_id", "created_at"],
            unique=False,
        )

    if "community_post_votes" not in tables:
        op.create_table(
            "community_post_votes",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("post_id", sa.String(length=36), nullable=False),
            sa.Column("value", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "post_id", name="uq_community_post_votes_user_post"),
            sa.CheckConstraint("value IN (-1, 1)", name="ck_community_post_votes_value"),
        )
        op.create_index(op.f("ix_community_post_votes_user_id"), "community_post_votes", ["user_id"], unique=False)
        op.create_index(op.f("ix_community_post_votes_post_id"), "community_post_votes", ["post_id"], unique=False)

    if "community_comment_votes" not in tables:
        op.create_table(
            "community_comment_votes",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("comment_id", sa.String(length=36), nullable=False),
            sa.Column("value", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["comment_id"], ["community_comments.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "comment_id", name="uq_community_comment_votes_user_comment"),
            sa.CheckConstraint("value IN (-1, 1)", name="ck_community_comment_votes_value"),
        )
        op.create_index(op.f("ix_community_comment_votes_user_id"), "community_comment_votes", ["user_id"], unique=False)
        op.create_index(op.f("ix_community_comment_votes_comment_id"), "community_comment_votes", ["comment_id"], unique=False)

    if "community_bookmarks" not in tables:
        op.create_table(
            "community_bookmarks",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("post_id", sa.String(length=36), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "post_id", name="uq_community_bookmarks_user_post"),
        )
        op.create_index(op.f("ix_community_bookmarks_user_id"), "community_bookmarks", ["user_id"], unique=False)
        op.create_index(op.f("ix_community_bookmarks_post_id"), "community_bookmarks", ["post_id"], unique=False)

    if "community_reports" not in tables:
        op.create_table(
            "community_reports",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("reporter_user_id", sa.String(length=36), nullable=False),
            sa.Column("target_type", sa.String(length=16), nullable=False),
            sa.Column("target_post_id", sa.String(length=36), nullable=True),
            sa.Column("target_comment_id", sa.String(length=36), nullable=True),
            sa.Column("reason", sa.String(length=64), nullable=False),
            sa.Column("details", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=16), nullable=False, server_default="open"),
            sa.Column("reviewed_by_user_id", sa.String(length=36), nullable=True),
            sa.Column("moderator_note", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["reporter_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["target_post_id"], ["community_posts.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["target_comment_id"], ["community_comments.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.CheckConstraint("target_type IN ('post', 'comment')", name="ck_community_reports_target_type"),
            sa.CheckConstraint(
                "status IN ('open', 'reviewing', 'resolved', 'dismissed')",
                name="ck_community_reports_status",
            ),
        )
        op.create_index(op.f("ix_community_reports_reporter_user_id"), "community_reports", ["reporter_user_id"], unique=False)
        op.create_index(op.f("ix_community_reports_target_type"), "community_reports", ["target_type"], unique=False)
        op.create_index(op.f("ix_community_reports_target_post_id"), "community_reports", ["target_post_id"], unique=False)
        op.create_index(op.f("ix_community_reports_target_comment_id"), "community_reports", ["target_comment_id"], unique=False)
        op.create_index(op.f("ix_community_reports_status"), "community_reports", ["status"], unique=False)
        op.create_index(op.f("ix_community_reports_reviewed_by_user_id"), "community_reports", ["reviewed_by_user_id"], unique=False)
        op.create_index(op.f("ix_community_reports_created_at"), "community_reports", ["created_at"], unique=False)
        op.create_index("ix_community_reports_queue", "community_reports", ["status", "created_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    tables = set(inspector.get_table_names())

    if "community_reports" in tables:
        for index_name in (
            "ix_community_reports_queue",
            op.f("ix_community_reports_created_at"),
            op.f("ix_community_reports_reviewed_by_user_id"),
            op.f("ix_community_reports_status"),
            op.f("ix_community_reports_target_comment_id"),
            op.f("ix_community_reports_target_post_id"),
            op.f("ix_community_reports_target_type"),
            op.f("ix_community_reports_reporter_user_id"),
        ):
            op.drop_index(index_name, table_name="community_reports")
        op.drop_table("community_reports")

    if "community_bookmarks" in tables:
        op.drop_index(op.f("ix_community_bookmarks_post_id"), table_name="community_bookmarks")
        op.drop_index(op.f("ix_community_bookmarks_user_id"), table_name="community_bookmarks")
        op.drop_table("community_bookmarks")

    if "community_comment_votes" in tables:
        op.drop_index(op.f("ix_community_comment_votes_comment_id"), table_name="community_comment_votes")
        op.drop_index(op.f("ix_community_comment_votes_user_id"), table_name="community_comment_votes")
        op.drop_table("community_comment_votes")

    if "community_post_votes" in tables:
        op.drop_index(op.f("ix_community_post_votes_post_id"), table_name="community_post_votes")
        op.drop_index(op.f("ix_community_post_votes_user_id"), table_name="community_post_votes")
        op.drop_table("community_post_votes")

    if "community_comments" in tables:
        for index_name in (
            "ix_community_comments_thread_lookup",
            op.f("ix_community_comments_created_at"),
            op.f("ix_community_comments_is_solution"),
            op.f("ix_community_comments_depth"),
            op.f("ix_community_comments_user_id"),
            op.f("ix_community_comments_parent_id"),
            op.f("ix_community_comments_post_id"),
        ):
            op.drop_index(index_name, table_name="community_comments")
        op.drop_table("community_comments")

    if "community_post_media" in tables:
        op.drop_index(op.f("ix_community_post_media_post_id"), table_name="community_post_media")
        op.drop_table("community_post_media")

    if "community_posts" in tables:
        for index_name in (
            "ix_community_posts_feed_hot_support",
            "ix_community_posts_feed_recent",
            op.f("ix_community_posts_solution_comment_id"),
            op.f("ix_community_posts_created_at"),
            op.f("ix_community_posts_is_private"),
            op.f("ix_community_posts_region_label"),
            op.f("ix_community_posts_user_id"),
        ):
            op.drop_index(index_name, table_name="community_posts")
        op.drop_table("community_posts")

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    user_indexes = {index["name"] for index in inspector.get_indexes("users")}

    if op.f("ix_users_green_thumb_karma") in user_indexes:
        op.drop_index(op.f("ix_users_green_thumb_karma"), table_name="users")
    if op.f("ix_users_is_community_moderator") in user_indexes:
        op.drop_index(op.f("ix_users_is_community_moderator"), table_name="users")
    if op.f("ix_users_private_feed_enabled") in user_indexes:
        op.drop_index(op.f("ix_users_private_feed_enabled"), table_name="users")
    if op.f("ix_users_region_label") in user_indexes:
        op.drop_index(op.f("ix_users_region_label"), table_name="users")

    if "green_thumb_karma" in user_columns:
        op.drop_column("users", "green_thumb_karma")
    if "is_community_moderator" in user_columns:
        op.drop_column("users", "is_community_moderator")
    if "private_feed_enabled" in user_columns:
        op.drop_column("users", "private_feed_enabled")
    if "region_label" in user_columns:
        op.drop_column("users", "region_label")
