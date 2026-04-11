from __future__ import annotations

import base64
import json
from datetime import datetime
from html import escape

from fastapi import APIRouter, Depends, HTTPException, Query, status
from markdown import markdown
from sqlalchemy import and_, case, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_optional_user, require_community_moderator
from app.db.session import get_session
from app.models.community import (
    CommunityBookmark,
    CommunityComment,
    CommunityCommentVote,
    CommunityPost,
    CommunityPostMedia,
    CommunityPostVote,
    CommunityReport,
)
from app.models.user import User
from app.schemas.community import (
    CommunityAuthorBrief,
    CommunityCommentCreateRequest,
    CommunityCommentResponse,
    CommunityCommentVoteRequest,
    CommunityFeedResponse,
    CommunityFeaturedCommentResponse,
    CommunityPostCreateRequest,
    CommunityPostMediaResponse,
    CommunityPostResponse,
    CommunityPostVoteRequest,
    CommunityReportCreateRequest,
    CommunityReportResponse,
    CommunityReportReviewRequest,
    CommunitySolutionUpdateRequest,
    CommunityThreadResponse,
    CommunityVoteSummary,
    FeedSort,
    MarkdownPreviewRequest,
    MarkdownPreviewResponse,
)

router = APIRouter(prefix="/community", tags=["community"])


def _encode_cursor(payload: dict[str, str | float]) -> str:
    data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(data).decode("utf-8")


def _decode_cursor(cursor: str | None) -> dict[str, str | float] | None:
    if not cursor:
        return None
    try:
        payload = base64.urlsafe_b64decode(cursor.encode("utf-8")).decode("utf-8")
        raw = json.loads(payload)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid cursor") from exc

    if not isinstance(raw, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid cursor payload")
    return raw


def _hot_score_expression():
    age_hours = (func.julianday(func.current_timestamp()) - func.julianday(CommunityPost.created_at)) * 24.0
    return (CommunityPost.upvotes - CommunityPost.downvotes) / (age_hours + 2.0)


def _apply_visibility_filter(stmt, viewer: User | None):
    if viewer is None:
        return stmt.where(CommunityPost.is_private.is_(False))
    if viewer.is_community_moderator or viewer.role in {"admin", "developer"}:
        return stmt
    return stmt.where(or_(CommunityPost.is_private.is_(False), CommunityPost.user_id == viewer.id))


def _author_brief(author: User) -> CommunityAuthorBrief:
    badges: list[str] = []
    if author.badges_json:
        try:
            parsed_badges = json.loads(author.badges_json)
            if isinstance(parsed_badges, list):
                badges = [str(item).strip() for item in parsed_badges if str(item).strip()]
        except json.JSONDecodeError:
            badges = []

    return CommunityAuthorBrief(
        id=author.id,
        full_name=author.full_name,
        role=author.role,
        avatar_url=author.avatar_url,
        bio=author.bio,
        region_label=author.region_label,
        is_verified=author.is_verified,
        badges=badges,
        green_thumb_karma=author.green_thumb_karma,
    )


def _featured_comment_response(
    comment: CommunityComment | None,
    *,
    viewer_vote: int = 0,
) -> CommunityFeaturedCommentResponse | None:
    if comment is None:
        return None
    return CommunityFeaturedCommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        body_markdown=comment.body_markdown,
        created_at=comment.created_at,
        is_solution=comment.is_solution,
        author=_author_brief(comment.author),
        votes=CommunityVoteSummary(
            upvotes=comment.upvotes,
            downvotes=comment.downvotes,
            score=comment.upvotes - comment.downvotes,
            viewer_vote=viewer_vote,
        ),
    )


def _select_featured_comment(post: CommunityPost) -> CommunityComment | None:
    if not post.comments:
        return None

    if post.solution_comment_id:
        for comment in post.comments:
            if comment.id == post.solution_comment_id:
                return comment

    root_comments = [comment for comment in post.comments if comment.parent_id is None]
    if not root_comments:
        root_comments = list(post.comments)

    root_comments.sort(
        key=lambda comment: (
            comment.upvotes - comment.downvotes,
            comment.replies_count,
            comment.created_at,
        ),
        reverse=True,
    )
    return root_comments[0] if root_comments else None


def _post_response(
    post: CommunityPost,
    *,
    viewer_vote: int,
    viewer_bookmarked: bool,
    hot_score: float,
    comment_vote_map: dict[str, int] | None = None,
) -> CommunityPostResponse:
    featured_comment = _select_featured_comment(post)
    effective_comment_vote_map = comment_vote_map or {}
    return CommunityPostResponse(
        id=post.id,
        title=post.title,
        body_markdown=post.body_markdown,
        region_label=post.region_label,
        is_private=post.is_private,
        comment_count=post.comment_count,
        bookmark_count=post.bookmark_count,
        created_at=post.created_at,
        updated_at=post.updated_at,
        solution_comment_id=post.solution_comment_id,
        deep_link=f"/community/post/{post.id}",
        author=_author_brief(post.author),
        media=[
            CommunityPostMediaResponse.model_validate(item)
            for item in sorted(post.media_items, key=lambda media_item: media_item.position)
        ],
        votes=CommunityVoteSummary(
            upvotes=post.upvotes,
            downvotes=post.downvotes,
            score=post.upvotes - post.downvotes,
            viewer_vote=viewer_vote,
        ),
        featured_comment=_featured_comment_response(
            featured_comment,
            viewer_vote=effective_comment_vote_map.get(featured_comment.id, 0) if featured_comment else 0,
        ),
        viewer_bookmarked=viewer_bookmarked,
        hot_score=hot_score,
    )


def _comment_response(comment: CommunityComment, viewer_vote: int) -> CommunityCommentResponse:
    return CommunityCommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        parent_id=comment.parent_id,
        depth=comment.depth,
        body_markdown=comment.body_markdown,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        is_solution=comment.is_solution,
        replies_count=comment.replies_count,
        author=_author_brief(comment.author),
        votes=CommunityVoteSummary(
            upvotes=comment.upvotes,
            downvotes=comment.downvotes,
            score=comment.upvotes - comment.downvotes,
            viewer_vote=viewer_vote,
        ),
        replies=[],
    )


async def _load_vote_maps(
    session: AsyncSession,
    *,
    viewer: User | None,
    post_ids: list[str],
) -> tuple[dict[str, int], set[str]]:
    if viewer is None or not post_ids:
        return {}, set()

    post_votes_result = await session.execute(
        select(CommunityPostVote.post_id, CommunityPostVote.value).where(
            CommunityPostVote.user_id == viewer.id,
            CommunityPostVote.post_id.in_(post_ids),
        )
    )
    bookmark_result = await session.execute(
        select(CommunityBookmark.post_id).where(
            CommunityBookmark.user_id == viewer.id,
            CommunityBookmark.post_id.in_(post_ids),
        )
    )
    vote_map = {row[0]: row[1] for row in post_votes_result.all()}
    bookmark_set = {row[0] for row in bookmark_result.all()}
    return vote_map, bookmark_set


async def _load_comment_vote_map(
    session: AsyncSession,
    *,
    viewer: User | None,
    comment_ids: list[str],
) -> dict[str, int]:
    if viewer is None or not comment_ids:
        return {}

    rows = (
        await session.execute(
            select(CommunityCommentVote.comment_id, CommunityCommentVote.value).where(
                CommunityCommentVote.user_id == viewer.id,
                CommunityCommentVote.comment_id.in_(comment_ids),
            )
        )
    ).all()
    return {comment_id: value for comment_id, value in rows}


@router.get("/feed", response_model=CommunityFeedResponse)
async def get_feed(
    sort: FeedSort = Query(default="recent"),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    region: str | None = Query(default=None, min_length=1, max_length=120),
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_user),
) -> CommunityFeedResponse:
    hot_score_expr = _hot_score_expression().label("hot_score")
    stmt = (
        select(CommunityPost, hot_score_expr)
        .options(
            selectinload(CommunityPost.author),
            selectinload(CommunityPost.media_items),
            selectinload(CommunityPost.comments).selectinload(CommunityComment.author),
        )
        .join(User, User.id == CommunityPost.user_id)
    )
    stmt = _apply_visibility_filter(stmt, current_user)

    effective_region = region
    if not effective_region and current_user and current_user.private_feed_enabled:
        effective_region = current_user.region_label

    if effective_region and effective_region.lower() != "global":
        stmt = stmt.where(or_(CommunityPost.region_label == effective_region, CommunityPost.region_label == "Global"))

    parsed_cursor = _decode_cursor(cursor)
    if sort == "recent":
        stmt = stmt.order_by(desc(CommunityPost.created_at), desc(CommunityPost.id))
        if parsed_cursor:
            cursor_dt = datetime.fromisoformat(str(parsed_cursor["created_at"]))
            cursor_id = str(parsed_cursor["id"])
            stmt = stmt.where(
                or_(
                    CommunityPost.created_at < cursor_dt,
                    and_(CommunityPost.created_at == cursor_dt, CommunityPost.id < cursor_id),
                )
            )
    else:
        stmt = stmt.order_by(desc(hot_score_expr), desc(CommunityPost.created_at), desc(CommunityPost.id))
        if parsed_cursor:
            cursor_hot = float(parsed_cursor["hot"])
            cursor_dt = datetime.fromisoformat(str(parsed_cursor["created_at"]))
            cursor_id = str(parsed_cursor["id"])
            stmt = stmt.where(
                or_(
                    hot_score_expr < cursor_hot,
                    and_(hot_score_expr == cursor_hot, CommunityPost.created_at < cursor_dt),
                    and_(hot_score_expr == cursor_hot, CommunityPost.created_at == cursor_dt, CommunityPost.id < cursor_id),
                )
            )

    result = await session.execute(stmt.limit(limit + 1))
    rows = result.all()
    page_rows = rows[:limit]
    post_ids = [row[0].id for row in page_rows]
    vote_map, bookmark_set = await _load_vote_maps(session, viewer=current_user, post_ids=post_ids)
    featured_comment_ids = [
        featured.id
        for post, _ in page_rows
        if (featured := _select_featured_comment(post)) is not None
    ]
    comment_vote_map = await _load_comment_vote_map(
        session,
        viewer=current_user,
        comment_ids=featured_comment_ids,
    )

    items = [
        _post_response(
            row[0],
            viewer_vote=vote_map.get(row[0].id, 0),
            viewer_bookmarked=row[0].id in bookmark_set,
            hot_score=float(row[1] or 0.0),
            comment_vote_map=comment_vote_map,
        )
        for row in page_rows
    ]

    next_cursor = None
    if len(rows) > limit and page_rows:
        last_post, last_hot = page_rows[-1]
        if sort == "recent":
            next_cursor = _encode_cursor({"created_at": last_post.created_at.isoformat(), "id": last_post.id})
        else:
            next_cursor = _encode_cursor(
                {
                    "hot": float(last_hot or 0.0),
                    "created_at": last_post.created_at.isoformat(),
                    "id": last_post.id,
                }
            )

    return CommunityFeedResponse(sort=sort, next_cursor=next_cursor, items=items)


@router.get("/feed/private", response_model=CommunityFeedResponse)
async def get_private_feed(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityFeedResponse:
    hot_score_expr = _hot_score_expression().label("hot_score")
    stmt = (
        select(CommunityPost, hot_score_expr)
        .options(
            selectinload(CommunityPost.author),
            selectinload(CommunityPost.media_items),
            selectinload(CommunityPost.comments).selectinload(CommunityComment.author),
        )
        .where(CommunityPost.user_id == current_user.id)
        .order_by(desc(CommunityPost.created_at), desc(CommunityPost.id))
    )

    parsed_cursor = _decode_cursor(cursor)
    if parsed_cursor:
        cursor_dt = datetime.fromisoformat(str(parsed_cursor["created_at"]))
        cursor_id = str(parsed_cursor["id"])
        stmt = stmt.where(
            or_(
                CommunityPost.created_at < cursor_dt,
                and_(CommunityPost.created_at == cursor_dt, CommunityPost.id < cursor_id),
            )
        )

    result = await session.execute(stmt.limit(limit + 1))
    rows = result.all()
    page_rows = rows[:limit]
    post_ids = [row[0].id for row in page_rows]
    vote_map, bookmark_set = await _load_vote_maps(session, viewer=current_user, post_ids=post_ids)
    featured_comment_ids = [
        featured.id
        for post, _ in page_rows
        if (featured := _select_featured_comment(post)) is not None
    ]
    comment_vote_map = await _load_comment_vote_map(
        session,
        viewer=current_user,
        comment_ids=featured_comment_ids,
    )

    items = [
        _post_response(
            row[0],
            viewer_vote=vote_map.get(row[0].id, 0),
            viewer_bookmarked=row[0].id in bookmark_set,
            hot_score=float(row[1] or 0.0),
            comment_vote_map=comment_vote_map,
        )
        for row in page_rows
    ]

    next_cursor = None
    if len(rows) > limit and page_rows:
        last_post = page_rows[-1][0]
        next_cursor = _encode_cursor({"created_at": last_post.created_at.isoformat(), "id": last_post.id})

    return CommunityFeedResponse(sort="recent", next_cursor=next_cursor, items=items)


@router.post("/posts", response_model=CommunityPostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: CommunityPostCreateRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityPostResponse:
    post = CommunityPost(
        user_id=current_user.id,
        title=payload.title,
        body_markdown=payload.body_markdown,
        region_label=payload.region_label,
        is_private=payload.is_private,
    )
    session.add(post)
    await session.flush()

    for idx, item in enumerate(payload.media):
        session.add(
            CommunityPostMedia(
                post_id=post.id,
                media_type=item.media_type,
                media_url=item.media_url,
                position=idx,
            )
        )

    await session.commit()
    await session.refresh(post)
    await session.refresh(current_user)

    post_with_links = await session.execute(
        select(CommunityPost)
        .options(
            selectinload(CommunityPost.author),
            selectinload(CommunityPost.media_items),
            selectinload(CommunityPost.comments).selectinload(CommunityComment.author),
        )
        .where(CommunityPost.id == post.id)
    )
    hydrated = post_with_links.scalar_one()
    return _post_response(hydrated, viewer_vote=0, viewer_bookmarked=False, hot_score=0.0)


@router.post("/posts/{post_id}/votes", response_model=CommunityVoteSummary)
async def vote_post(
    post_id: str,
    payload: CommunityPostVoteRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityVoteSummary:
    post = (
        await session.execute(select(CommunityPost).where(CommunityPost.id == post_id))
    ).scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    vote = (
        await session.execute(
            select(CommunityPostVote).where(
                CommunityPostVote.post_id == post_id,
                CommunityPostVote.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()

    def _decrement_counts(value: int) -> None:
        if value == 1:
            post.upvotes = max(0, post.upvotes - 1)
        else:
            post.downvotes = max(0, post.downvotes - 1)

    if vote is None:
        vote = CommunityPostVote(user_id=current_user.id, post_id=post_id, value=payload.value)
        session.add(vote)
        if payload.value == 1:
            post.upvotes += 1
        else:
            post.downvotes += 1
        viewer_vote = payload.value
    elif vote.value == payload.value:
        _decrement_counts(vote.value)
        await session.delete(vote)
        viewer_vote = 0
    else:
        _decrement_counts(vote.value)
        vote.value = payload.value
        if payload.value == 1:
            post.upvotes += 1
        else:
            post.downvotes += 1
        viewer_vote = payload.value

    await session.commit()
    return CommunityVoteSummary(
        upvotes=post.upvotes,
        downvotes=post.downvotes,
        score=post.upvotes - post.downvotes,
        viewer_vote=viewer_vote,
    )


@router.post("/posts/{post_id}/bookmarks", response_model=dict[str, bool])
async def toggle_bookmark(
    post_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    post = (
        await session.execute(select(CommunityPost).where(CommunityPost.id == post_id))
    ).scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    bookmark = (
        await session.execute(
            select(CommunityBookmark).where(
                CommunityBookmark.post_id == post_id,
                CommunityBookmark.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()

    if bookmark is None:
        session.add(CommunityBookmark(user_id=current_user.id, post_id=post_id))
        post.bookmark_count += 1
        bookmarked = True
    else:
        await session.delete(bookmark)
        post.bookmark_count = max(0, post.bookmark_count - 1)
        bookmarked = False

    await session.commit()
    return {"bookmarked": bookmarked}


@router.post("/posts/{post_id}/comments", response_model=CommunityCommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: str,
    payload: CommunityCommentCreateRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityCommentResponse:
    post = (
        await session.execute(select(CommunityPost).where(CommunityPost.id == post_id))
    ).scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    parent: CommunityComment | None = None
    depth = 0
    if payload.parent_id:
        parent = (
            await session.execute(
                select(CommunityComment).where(
                    CommunityComment.id == payload.parent_id,
                    CommunityComment.post_id == post_id,
                )
            )
        ).scalar_one_or_none()
        if parent is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found")
        depth = parent.depth + 1

    comment = CommunityComment(
        post_id=post_id,
        parent_id=payload.parent_id,
        user_id=current_user.id,
        body_markdown=payload.body_markdown,
        depth=depth,
    )
    session.add(comment)
    post.comment_count += 1
    if parent is not None:
        parent.replies_count += 1

    await session.commit()

    hydrated = (
        await session.execute(
            select(CommunityComment)
            .options(selectinload(CommunityComment.author))
            .where(CommunityComment.id == comment.id)
        )
    ).scalar_one()
    return _comment_response(hydrated, viewer_vote=0)


@router.post("/comments/{comment_id}/votes", response_model=CommunityVoteSummary)
async def vote_comment(
    comment_id: str,
    payload: CommunityCommentVoteRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityVoteSummary:
    comment = (
        await session.execute(select(CommunityComment).where(CommunityComment.id == comment_id))
    ).scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    vote = (
        await session.execute(
            select(CommunityCommentVote).where(
                CommunityCommentVote.comment_id == comment_id,
                CommunityCommentVote.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()

    def _decrement_counts(value: int) -> None:
        if value == 1:
            comment.upvotes = max(0, comment.upvotes - 1)
        else:
            comment.downvotes = max(0, comment.downvotes - 1)

    if vote is None:
        vote = CommunityCommentVote(user_id=current_user.id, comment_id=comment_id, value=payload.value)
        session.add(vote)
        if payload.value == 1:
            comment.upvotes += 1
        else:
            comment.downvotes += 1
        viewer_vote = payload.value
    elif vote.value == payload.value:
        _decrement_counts(vote.value)
        await session.delete(vote)
        viewer_vote = 0
    else:
        _decrement_counts(vote.value)
        vote.value = payload.value
        if payload.value == 1:
            comment.upvotes += 1
        else:
            comment.downvotes += 1
        viewer_vote = payload.value

    await session.commit()
    return CommunityVoteSummary(
        upvotes=comment.upvotes,
        downvotes=comment.downvotes,
        score=comment.upvotes - comment.downvotes,
        viewer_vote=viewer_vote,
    )


@router.patch("/posts/{post_id}/solution", response_model=CommunityPostResponse)
async def mark_solution(
    post_id: str,
    payload: CommunitySolutionUpdateRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityPostResponse:
    post = (
        await session.execute(
            select(CommunityPost)
            .options(
                selectinload(CommunityPost.author),
                selectinload(CommunityPost.media_items),
                selectinload(CommunityPost.comments).selectinload(CommunityComment.author),
            )
            .where(CommunityPost.id == post_id)
        )
    ).scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    can_moderate = current_user.is_community_moderator or current_user.role in {"admin", "developer"}
    if post.user_id != current_user.id and not can_moderate:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to mark solution")

    comment = (
        await session.execute(
            select(CommunityComment).where(
                CommunityComment.id == payload.comment_id,
                CommunityComment.post_id == post_id,
            )
        )
    ).scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    await session.execute(
        CommunityComment.__table__.update()
        .where(CommunityComment.post_id == post_id)
        .values(is_solution=case((CommunityComment.id == payload.comment_id, True), else_=False))
    )
    post.solution_comment_id = payload.comment_id

    await session.commit()
    await session.refresh(post)
    return _post_response(post, viewer_vote=0, viewer_bookmarked=False, hot_score=0.0)


@router.get("/posts/{post_id}", response_model=CommunityThreadResponse)
async def get_thread(
    post_id: str,
    focused_comment_id: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_user),
) -> CommunityThreadResponse:
    hot_score_expr = _hot_score_expression().label("hot_score")
    post_row = await session.execute(
        _apply_visibility_filter(
            select(CommunityPost, hot_score_expr)
            .options(
                selectinload(CommunityPost.author),
                selectinload(CommunityPost.media_items),
                selectinload(CommunityPost.comments).selectinload(CommunityComment.author),
            )
            .where(CommunityPost.id == post_id),
            current_user,
        )
    )
    row = post_row.first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    post, hot_score = row

    comments = (
        await session.execute(
            select(CommunityComment)
            .options(selectinload(CommunityComment.author))
            .where(CommunityComment.post_id == post_id)
            .order_by(CommunityComment.created_at.asc(), CommunityComment.id.asc())
        )
    ).scalars().all()

    comment_vote_map: dict[str, int] = {}
    post_vote = 0
    bookmarked = False
    if current_user is not None:
        if comments:
            vote_rows = (
                await session.execute(
                    select(CommunityCommentVote.comment_id, CommunityCommentVote.value).where(
                        CommunityCommentVote.user_id == current_user.id,
                        CommunityCommentVote.comment_id.in_([item.id for item in comments]),
                    )
                )
            ).all()
            comment_vote_map = {comment_id: value for comment_id, value in vote_rows}

        post_vote_row = (
            await session.execute(
                select(CommunityPostVote.value).where(
                    CommunityPostVote.user_id == current_user.id,
                    CommunityPostVote.post_id == post_id,
                )
            )
        ).scalar_one_or_none()
        post_vote = int(post_vote_row or 0)

        bookmarked = (
            await session.execute(
                select(CommunityBookmark.id).where(
                    CommunityBookmark.user_id == current_user.id,
                    CommunityBookmark.post_id == post_id,
                )
            )
        ).scalar_one_or_none() is not None

    response_map = {item.id: _comment_response(item, comment_vote_map.get(item.id, 0)) for item in comments}
    roots: list[CommunityCommentResponse] = []
    for item in comments:
        response_item = response_map[item.id]
        if item.parent_id and item.parent_id in response_map:
            response_map[item.parent_id].replies.append(response_item)
        else:
            roots.append(response_item)

    return CommunityThreadResponse(
        post=_post_response(
            post,
            viewer_vote=post_vote,
            viewer_bookmarked=bookmarked,
            hot_score=float(hot_score or 0.0),
            comment_vote_map=comment_vote_map,
        ),
        comments=roots,
        focused_comment_id=focused_comment_id,
    )


@router.post("/reports", response_model=CommunityReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: CommunityReportCreateRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommunityReportResponse:
    if payload.target_type == "post" and not payload.target_post_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="target_post_id is required for post reports")
    if payload.target_type == "comment" and not payload.target_comment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_comment_id is required for comment reports",
        )

    report = CommunityReport(
        reporter_user_id=current_user.id,
        target_type=payload.target_type,
        target_post_id=payload.target_post_id,
        target_comment_id=payload.target_comment_id,
        reason=payload.reason,
        details=payload.details,
        status="open",
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)
    return CommunityReportResponse.model_validate(report)


@router.get("/moderation/reports", response_model=list[CommunityReportResponse])
async def list_reports(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(require_community_moderator),
) -> list[CommunityReportResponse]:
    stmt = select(CommunityReport).order_by(CommunityReport.created_at.desc())
    if status_filter:
        stmt = stmt.where(CommunityReport.status == status_filter)

    rows = (await session.execute(stmt.limit(limit))).scalars().all()
    return [CommunityReportResponse.model_validate(item) for item in rows]


@router.patch("/moderation/reports/{report_id}", response_model=CommunityReportResponse)
async def review_report(
    report_id: str,
    payload: CommunityReportReviewRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_community_moderator),
) -> CommunityReportResponse:
    report = (
        await session.execute(select(CommunityReport).where(CommunityReport.id == report_id))
    ).scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    report.status = payload.status
    report.moderator_note = payload.moderator_note
    report.reviewed_by_user_id = current_user.id
    report.reviewed_at = datetime.utcnow()

    await session.commit()
    await session.refresh(report)
    return CommunityReportResponse.model_validate(report)


@router.post("/markdown/preview", response_model=MarkdownPreviewResponse)
async def markdown_preview(payload: MarkdownPreviewRequest) -> MarkdownPreviewResponse:
    raw_html = markdown(payload.markdown, extensions=["extra", "nl2br", "sane_lists"])

    try:
        import bleach

        safe_html = bleach.clean(
            raw_html,
            tags=[
                "p",
                "br",
                "strong",
                "em",
                "a",
                "ul",
                "ol",
                "li",
                "blockquote",
                "code",
                "pre",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
            ],
            attributes={"a": ["href", "title", "target", "rel"]},
            protocols=["http", "https", "mailto"],
            strip=True,
        )
    except Exception:
        safe_html = f"<pre>{escape(payload.markdown)}</pre>"

    return MarkdownPreviewResponse(html=safe_html)
