from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(180))
    body_markdown: Mapped[str] = mapped_column(Text)
    region_label: Mapped[str] = mapped_column(String(120), index=True)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    bookmark_count: Mapped[int] = mapped_column(Integer, default=0)
    solution_comment_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("upvotes >= 0", name="ck_community_posts_upvotes_non_negative"),
        CheckConstraint("downvotes >= 0", name="ck_community_posts_downvotes_non_negative"),
        CheckConstraint("comment_count >= 0", name="ck_community_posts_comment_count_non_negative"),
        CheckConstraint("bookmark_count >= 0", name="ck_community_posts_bookmark_count_non_negative"),
    )

    author = relationship("User", back_populates="community_posts")
    media_items = relationship("CommunityPostMedia", back_populates="post", cascade="all,delete-orphan")
    comments = relationship("CommunityComment", back_populates="post", cascade="all,delete-orphan")
    votes = relationship("CommunityPostVote", back_populates="post", cascade="all,delete-orphan")
    bookmarks = relationship("CommunityBookmark", back_populates="post", cascade="all,delete-orphan")


class CommunityPostMedia(Base):
    __tablename__ = "community_post_media"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    post_id: Mapped[str] = mapped_column(String(36), ForeignKey("community_posts.id", ondelete="CASCADE"), index=True)
    media_type: Mapped[str] = mapped_column(String(16))
    media_url: Mapped[str] = mapped_column(String(512))
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("media_type IN ('image','video')", name="ck_community_post_media_type"),
        CheckConstraint("position >= 0", name="ck_community_post_media_position_non_negative"),
    )

    post = relationship("CommunityPost", back_populates="media_items")


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    post_id: Mapped[str] = mapped_column(String(36), ForeignKey("community_posts.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("community_comments.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    body_markdown: Mapped[str] = mapped_column(Text)
    depth: Mapped[int] = mapped_column(Integer, default=0, index=True)
    is_solution: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, default=0)
    replies_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("depth >= 0", name="ck_community_comments_depth_non_negative"),
        CheckConstraint("upvotes >= 0", name="ck_community_comments_upvotes_non_negative"),
        CheckConstraint("downvotes >= 0", name="ck_community_comments_downvotes_non_negative"),
        CheckConstraint("replies_count >= 0", name="ck_community_comments_replies_non_negative"),
    )

    post = relationship("CommunityPost", back_populates="comments")
    author = relationship("User", back_populates="community_comments")
    parent = relationship("CommunityComment", remote_side=[id], back_populates="children")
    children = relationship("CommunityComment", back_populates="parent", cascade="all,delete-orphan")
    votes = relationship("CommunityCommentVote", back_populates="comment", cascade="all,delete-orphan")


class CommunityPostVote(Base):
    __tablename__ = "community_post_votes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    post_id: Mapped[str] = mapped_column(String(36), ForeignKey("community_posts.id", ondelete="CASCADE"), index=True)
    value: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_community_post_votes_user_post"),
        CheckConstraint("value IN (-1, 1)", name="ck_community_post_votes_value"),
    )

    post = relationship("CommunityPost", back_populates="votes")


class CommunityCommentVote(Base):
    __tablename__ = "community_comment_votes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    comment_id: Mapped[str] = mapped_column(String(36), ForeignKey("community_comments.id", ondelete="CASCADE"), index=True)
    value: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "comment_id", name="uq_community_comment_votes_user_comment"),
        CheckConstraint("value IN (-1, 1)", name="ck_community_comment_votes_value"),
    )

    comment = relationship("CommunityComment", back_populates="votes")


class CommunityBookmark(Base):
    __tablename__ = "community_bookmarks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    post_id: Mapped[str] = mapped_column(String(36), ForeignKey("community_posts.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_community_bookmarks_user_post"),)

    post = relationship("CommunityPost", back_populates="bookmarks")


class CommunityReport(Base):
    __tablename__ = "community_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    reporter_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    target_type: Mapped[str] = mapped_column(String(16), index=True)
    target_post_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=True, index=True)
    target_comment_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("community_comments.id", ondelete="CASCADE"), nullable=True, index=True)
    reason: Mapped[str] = mapped_column(String(64))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="open", index=True)
    reviewed_by_user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    moderator_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("target_type IN ('post', 'comment')", name="ck_community_reports_target_type"),
        CheckConstraint("status IN ('open', 'reviewing', 'resolved', 'dismissed')", name="ck_community_reports_status"),
    )
