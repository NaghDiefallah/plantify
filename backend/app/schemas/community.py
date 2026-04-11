from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


FeedSort = Literal["recent", "hot"]
VoteValue = Literal[-1, 1]
MediaType = Literal["image", "video"]
ReportTargetType = Literal["post", "comment"]
ReportStatus = Literal["open", "reviewing", "resolved", "dismissed"]


class PostMediaCreate(BaseModel):
    media_type: MediaType
    media_url: str = Field(min_length=1, max_length=512)


class CommunityPostCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    body_markdown: str = Field(min_length=1, max_length=30000)
    media: list[PostMediaCreate] = Field(default_factory=list, max_length=10)
    region_label: str = Field(default="Global", min_length=1, max_length=120)
    is_private: bool = False


class CommunityPostVoteRequest(BaseModel):
    value: VoteValue


class CommunityCommentCreateRequest(BaseModel):
    body_markdown: str = Field(min_length=1, max_length=10000)
    parent_id: str | None = None


class CommunityCommentVoteRequest(BaseModel):
    value: VoteValue


class CommunitySolutionUpdateRequest(BaseModel):
    comment_id: str


class CommunityReportCreateRequest(BaseModel):
    target_type: ReportTargetType
    target_post_id: str | None = None
    target_comment_id: str | None = None
    reason: str = Field(min_length=2, max_length=64)
    details: str | None = Field(default=None, max_length=2000)


class CommunityReportReviewRequest(BaseModel):
    status: ReportStatus
    moderator_note: str | None = Field(default=None, max_length=2000)


class MarkdownPreviewRequest(BaseModel):
    markdown: str = Field(min_length=0, max_length=50000)


class MarkdownPreviewResponse(BaseModel):
    html: str


class CommunityPostMediaResponse(BaseModel):
    id: str
    media_type: MediaType
    media_url: str
    position: int

    model_config = {"from_attributes": True}


class CommunityAuthorBrief(BaseModel):
    id: str
    full_name: str
    role: str
    avatar_url: str | None = None
    bio: str | None = None
    region_label: str
    is_verified: bool = False
    badges: list[str] = Field(default_factory=list)
    green_thumb_karma: int


class CommunityVoteSummary(BaseModel):
    upvotes: int
    downvotes: int
    score: int
    viewer_vote: int


class CommunityFeaturedCommentResponse(BaseModel):
    id: str
    post_id: str
    body_markdown: str
    created_at: datetime
    is_solution: bool
    author: CommunityAuthorBrief
    votes: CommunityVoteSummary


class CommunityPostResponse(BaseModel):
    id: str
    title: str
    body_markdown: str
    region_label: str
    is_private: bool
    comment_count: int
    bookmark_count: int
    created_at: datetime
    updated_at: datetime
    solution_comment_id: str | None
    deep_link: str
    author: CommunityAuthorBrief
    media: list[CommunityPostMediaResponse]
    votes: CommunityVoteSummary
    featured_comment: CommunityFeaturedCommentResponse | None = None
    viewer_bookmarked: bool
    hot_score: float


class CommunityCommentResponse(BaseModel):
    id: str
    post_id: str
    parent_id: str | None
    depth: int
    body_markdown: str
    created_at: datetime
    updated_at: datetime
    is_solution: bool
    replies_count: int
    author: CommunityAuthorBrief
    votes: CommunityVoteSummary
    replies: list["CommunityCommentResponse"] = Field(default_factory=list)


class CommunityThreadResponse(BaseModel):
    post: CommunityPostResponse
    comments: list[CommunityCommentResponse]
    focused_comment_id: str | None = None


class CommunityFeedResponse(BaseModel):
    sort: FeedSort
    next_cursor: str | None
    items: list[CommunityPostResponse]


class CommunityReportResponse(BaseModel):
    id: str
    target_type: ReportTargetType
    target_post_id: str | None
    target_comment_id: str | None
    reason: str
    details: str | None
    status: ReportStatus
    reporter_user_id: str
    reviewed_by_user_id: str | None
    moderator_note: str | None
    created_at: datetime
    reviewed_at: datetime | None

    model_config = {"from_attributes": True}


CommunityCommentResponse.model_rebuild()