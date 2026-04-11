from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    avatar_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="farmer", index=True)
    region_label: Mapped[str] = mapped_column(String(120), default="Global", index=True)
    private_feed_enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_community_moderator: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    badges_json: Mapped[str] = mapped_column(Text, default="[]")
    green_thumb_karma: Mapped[int] = mapped_column(Integer, default=0, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    scans = relationship("ScanHistory", back_populates="user", cascade="all,delete-orphan")
    community_posts = relationship("CommunityPost", back_populates="author", cascade="all,delete-orphan")
    community_comments = relationship("CommunityComment", back_populates="author", cascade="all,delete-orphan")
