"use client";

import {createPortal} from "react-dom";
import {useCallback, useEffect, useMemo, useState} from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  Globe2,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Video,
  X
} from "lucide-react";

import {
  createCommunityComment,
  createCommunityPost,
  fetchCommunityFeed,
  fetchCommunityThread,
  fetchModerationReports,
  fetchUserProfile,
  getStoredAccessToken,
  markCommunitySolution,
  previewMarkdown,
  reviewModerationReport,
  submitCommunityReport,
  toggleCommunityBookmark,
  updateMyProfile,
  updateUserRecognition,
  voteCommunityComment,
  voteCommunityPost
} from "@/lib/api";
import type {
  CommunityAuthorBrief,
  CommunityComment,
  CommunityFeedSort,
  CommunityPost,
  CommunityReport,
  CommunityReportStatus,
  CommunityThreadResponse,
  UserProfile,
  UserRecognitionUpdatePayload
} from "@/lib/types";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {cn} from "@/lib/utils";
import {AppLink} from "@/components/app-link";

type CommunityExperienceProps = {
  profile: UserProfile | null;
  initialPostId?: string;
};

type AttachmentDraft = {
  id: string;
  media_type: "image" | "video";
  media_url: string;
  name: string;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "P";
}

function applyProfileToAuthor(author: CommunityAuthorBrief, profile: UserProfile): CommunityAuthorBrief {
  if (author.id !== profile.id) {
    return author;
  }

  return {
    ...author,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    role: profile.role,
    region_label: profile.region_label,
    is_verified: profile.is_verified,
    badges: profile.badges,
    green_thumb_karma: profile.green_thumb_karma
  };
}

function applyProfileToComments(comments: CommunityComment[], profile: UserProfile): CommunityComment[] {
  return comments.map((comment) => ({
    ...comment,
    author: applyProfileToAuthor(comment.author, profile),
    replies: applyProfileToComments(comment.replies, profile)
  }));
}

function applyProfileToFeed(posts: CommunityPost[], profile: UserProfile): CommunityPost[] {
  return posts.map((post) => ({
    ...post,
    author: applyProfileToAuthor(post.author, profile),
    featured_comment: post.featured_comment
      ? {
          ...post.featured_comment,
          author: applyProfileToAuthor(post.featured_comment.author, profile)
        }
      : null
  }));
}

function Avatar({name, avatarUrl, className}: {name: string; avatarUrl?: string | null; className?: string}) {
  if (avatarUrl) {
    return <Image className={cn("rounded-full object-cover", className)} src={avatarUrl} alt={name} width={96} height={96} unoptimized />;
  }

  return (
    <div className={cn("flex items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] font-semibold text-[var(--text-primary)]", className)}>
      {initials(name)}
    </div>
  );
}

function VerifiedMark() {
  return <CheckCircle2 className="h-4 w-4 fill-sky-500 text-sky-500" aria-label="Verified" />;
}

function BadgeRow({badges}: {badges: string[]}) {
  if (!badges.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.slice(0, 4).map((badge) => (
        <span
          key={badge}
          className="rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

function FeaturedCommentCard({
  comment,
  onOpenProfile,
  onOpenThread
}: {
  comment: NonNullable<CommunityPost["featured_comment"]>;
  onOpenProfile: (userId: string) => void;
  onOpenThread: () => void;
}) {
  return (
    <div className="mt-4 rounded-[1.2rem] border border-[var(--card-border)] bg-[var(--bg-secondary)]/80 p-3 text-left">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenProfile(comment.author.id);
          }}
          className="shrink-0"
          aria-label={`View ${comment.author.full_name} profile`}
        >
          <Avatar name={comment.author.full_name} avatarUrl={comment.author.avatar_url} className="h-9 w-9 text-sm" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onOpenProfile(comment.author.id);
              }}
              className="truncate text-sm font-semibold text-[var(--text-primary)]"
            >
              {comment.author.full_name}
            </button>
            {comment.author.is_verified ? <VerifiedMark /> : null}
            {comment.is_solution ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
          </div>
          <p className="mt-1 max-h-12 overflow-hidden text-sm leading-6 text-[var(--text-secondary)]">{comment.body_markdown}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
            <span>{formatRelativeTime(comment.created_at)}</span>
            <span>{comment.votes.score} score</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenThread}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--ring)]/30 hover:text-[var(--text-primary)]"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Open thread
      </button>
    </div>
  );
}

function formatRelativeTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}

function createAttachmentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function MediaCarousel({post}: {post: CommunityPost}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [post.id]);

  if (!post.media.length) {
    return null;
  }

  const activeMedia = post.media[Math.min(active, post.media.length - 1)];

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-[var(--card-border)] bg-[var(--bg-secondary)]/80">
      <div className="relative overflow-hidden bg-[var(--bg-secondary)]">
        {activeMedia.media_type === "video" ? (
          <video className="max-h-[460px] w-full object-cover" src={activeMedia.media_url} controls muted autoPlay loop playsInline />
        ) : (
          <div className="relative h-[460px] w-full">
            <Image className="object-cover" src={activeMedia.media_url} alt={post.title} fill sizes="(max-width: 1024px) 100vw, 740px" unoptimized />
          </div>
        )}
      </div>

      {post.media.length > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--card-border)] px-3 py-2.5">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
            onClick={() => setActive((prev) => (prev === 0 ? post.media.length - 1 : prev - 1))}
            aria-label="Previous attachment"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {post.media.map((media, index) => (
              <button
                key={media.id}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View attachment ${index + 1}`}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  index === active ? "w-8 bg-[var(--text-primary)]" : "w-2.5 bg-[var(--card-border)]"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)]"
            onClick={() => setActive((prev) => (prev + 1) % post.media.length)}
            aria-label="Next attachment"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CommentTree({
  comments,
  onVote,
  onReply,
  onReport,
  onMarkSolution,
  canMarkSolution,
  solutionCommentId
}: {
  comments: CommunityComment[];
  onVote: (commentId: string, value: -1 | 1) => Promise<void>;
  onReply: (parentId: string, body: string) => Promise<void>;
  onReport: (commentId: string) => Promise<void>;
  onMarkSolution: (commentId: string) => Promise<void>;
  canMarkSolution: boolean;
  solutionCommentId: string | null;
}) {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});

  return (
    <ul className="space-y-3">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-[1.1rem] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{comment.author.full_name}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {comment.author.region_label} • {formatRelativeTime(comment.created_at)}
              </p>
            </div>

            {comment.is_solution || solutionCommentId === comment.id ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Solution
              </span>
            ) : null}
          </div>

          <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)]">{comment.body_markdown}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onVote(comment.id, 1)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {comment.votes.upvotes}
            </button>

            <button
              type="button"
              onClick={() => onVote(comment.id, -1)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {comment.votes.downvotes}
            </button>

            <button
              type="button"
              onClick={() => setReplyOpen((prev) => ({...prev, [comment.id]: !prev[comment.id]}))}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Reply
            </button>

            <button
              type="button"
              onClick={() => void onReport(comment.id)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
            >
              <Flag className="h-3.5 w-3.5" />
              Report
            </button>

            {canMarkSolution ? (
              <button
                type="button"
                onClick={() => onMarkSolution(comment.id)}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--ring)]/35 bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark solution
              </button>
            ) : null}
          </div>

          {replyOpen[comment.id] ? (
            <div className="mt-3 space-y-2">
              <Textarea
                value={replyDrafts[comment.id] ?? ""}
                onChange={(event) => setReplyDrafts((prev) => ({...prev, [comment.id]: event.target.value}))}
                placeholder="Write a reply"
                className="min-h-24 rounded-2xl"
              />
              <Button
                size="sm"
                onClick={async () => {
                  const body = (replyDrafts[comment.id] ?? "").trim();
                  if (!body) {
                    return;
                  }
                  await onReply(comment.id, body);
                  setReplyDrafts((prev) => ({...prev, [comment.id]: ""}));
                  setReplyOpen((prev) => ({...prev, [comment.id]: false}));
                }}
              >
                Reply
              </Button>
            </div>
          ) : null}

          {comment.replies.length > 0 ? (
            <div className="mt-3 border-l border-[var(--card-border)] pl-3">
              <CommentTree
                comments={comment.replies}
                onVote={onVote}
                onReply={onReply}
                onReport={onReport}
                onMarkSolution={onMarkSolution}
                canMarkSolution={canMarkSolution}
                solutionCommentId={solutionCommentId}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ComposerModal({
  open,
  onClose,
  profile,
  onPublish
}: {
  open: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onPublish: () => Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    document.body.style.overflow = "hidden";
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [onClose, open]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-[3px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-composer-title"
        className="w-full max-w-3xl rounded-[2rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_35px_90px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <ComposerForm profile={profile} onClose={onClose} onPublish={onPublish} />
      </div>
    </div>,
    document.body
  );
}

function ComposerForm({
  profile,
  onClose,
  onPublish
}: {
  profile: UserProfile | null;
  onClose: () => void;
  onPublish: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [region, setRegion] = useState(profile?.region_label ?? "Global");
  const [isPrivate, setIsPrivate] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    setError(null);
    try {
      const response = await previewMarkdown({markdown: body});
      setPreviewHtml(response.html);
      setMode("preview");
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Unable to generate preview.");
    } finally {
      setPreviewLoading(false);
    }
  }, [body]);

  const handleFileSelection = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    try {
      const nextAttachments = await Promise.all(
        files.map(async (file) => {
          if (file.size > 12 * 1024 * 1024) {
            throw new Error(`${file.name} exceeds the 12 MB limit.`);
          }

          const media_type = file.type.startsWith("video/") ? "video" : "image";
          const media_url = await readFileAsDataUrl(file);
          return {
            id: createAttachmentId(),
            media_type,
            media_url,
            name: file.name
          } satisfies AttachmentDraft;
        })
      );

      setAttachments((prev) => [...prev, ...nextAttachments]);
      setError(null);
      event.target.value = "";
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Unable to attach files.");
    }
  }, []);

  return (
    <div className="flex max-h-[88vh] flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--card-border)] px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Create post</p>
          <h2 id="community-composer-title" className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            Post to the group
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          aria-label="Close composer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[1.25fr_0.9fr]">
        <div className="min-h-0 overflow-auto px-6 py-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[1.3rem] border border-[var(--card-border)] bg-[var(--bg-secondary)]/70 px-4 py-3">
              <Avatar name={profile?.full_name ?? "Plantify member"} avatarUrl={profile?.avatar_url} className="h-11 w-11 text-sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{profile?.full_name ?? "Plantify member"}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{region.trim() || "Global"}</p>
              </div>
            </div>

            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Post title" />

            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What do you want to share?"
              className="min-h-52 rounded-[1.25rem]"
            />

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Region" />
              <label className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)]">
                <input checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} type="checkbox" />
                Private
              </label>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--ring)]/40">
                <ImagePlus className="h-4 w-4" />
                Add media
                <input accept="image/*,video/*" className="hidden" multiple type="file" onChange={handleFileSelection} />
              </label>
            </div>

            {attachments.length > 0 ? (
              <div className="space-y-3 rounded-[1.4rem] border border-[var(--card-border)] bg-[var(--bg-secondary)]/65 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Attachments</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{attachments.length} selected</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="overflow-hidden rounded-[1rem] border border-[var(--card-border)] bg-[var(--card-bg)]">
                      <div className="h-40 overflow-hidden bg-[var(--bg-secondary)]">
                        {attachment.media_type === "video" ? (
                          <video className="h-full w-full object-cover" src={attachment.media_url} muted controls playsInline />
                        ) : (
                          <div className="relative h-full w-full">
                            <Image className="object-cover" src={attachment.media_url} alt={attachment.name} fill sizes="(max-width: 640px) 100vw, 50vw" unoptimized />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--text-primary)]">{attachment.name}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {attachment.media_type === "video" ? "Video" : "Image"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-border)] text-[var(--text-secondary)]"
                          aria-label={`Remove ${attachment.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-[var(--card-border)] bg-[var(--bg-secondary)]/55 px-6 py-5 lg:border-l lg:border-t-0">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("write")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                mode === "write" ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : "border border-[var(--card-border)] text-[var(--text-secondary)]"
              )}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => void loadPreview()}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                mode === "preview" ? "text-white" : "border border-[var(--card-border)] text-[var(--text-secondary)]"
              )}
              style={mode === "preview" ? {backgroundColor: "var(--accent)"} : undefined}
            >
              {previewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Preview
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.07)]">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{profile?.full_name ?? "Plantify member"}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{region.trim() || "Global"}</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold leading-tight text-[var(--text-primary)]">
              {title.trim() || "Your post title will appear here"}
            </h3>

            <div className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {mode === "preview" ? (
                <div
                  className="prose prose-sm max-w-none text-[var(--text-primary)] dark:prose-invert"
                  dangerouslySetInnerHTML={{__html: previewHtml || "<p><em>Add content to preview.</em></p>"}}
                />
              ) : (
                <p className="whitespace-pre-wrap">{body.trim() || "Your post preview shows here."}</p>
              )}
            </div>

            {attachments.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {attachments.slice(0, 4).map((attachment) => (
                  <div key={attachment.id} className="overflow-hidden rounded-[1rem] border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                    <div className="h-28 overflow-hidden">
                      {attachment.media_type === "video" ? (
                        <video className="h-full w-full object-cover" src={attachment.media_url} muted controls playsInline />
                      ) : (
                        <div className="relative h-full w-full">
                          <Image className="object-cover" src={attachment.media_url} alt={attachment.name} fill sizes="(max-width: 640px) 100vw, 50vw" unoptimized />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)]">
                      {attachment.media_type === "video" ? <Video className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
                      <span className="truncate">{attachment.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-tertiary)]">Preview uses the same renderer as the backend.</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={submitting || !title.trim() || !body.trim()}
                onClick={async () => {
                  setSubmitting(true);
                  setError(null);
                  try {
                    await createCommunityPost({
                      token: getStoredAccessToken() ?? "",
                      payload: {
                        title: title.trim(),
                        body_markdown: body.trim(),
                        media: attachments.map((attachment) => ({
                          media_type: attachment.media_type,
                          media_url: attachment.media_url
                        })),
                        region_label: region.trim() || "Global",
                        is_private: isPrivate
                      }
                    });
                    await onPublish();
                    onClose();
                  } catch (submitError) {
                    setError(submitError instanceof Error ? submitError.message : "Unable to publish the post.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Publish
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileModal({
  open,
  onClose,
  loading,
  profile,
  currentProfile,
  canGrantBadges,
  canVerify,
  onSaveProfile,
  onSaveRecognition,
  recognitionBusy
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  profile: UserProfile | null;
  currentProfile: UserProfile | null;
  canGrantBadges: boolean;
  canVerify: boolean;
  onSaveProfile: (payload: { full_name?: string; avatar_url?: string; bio?: string; region_label?: string }) => Promise<void>;
  onSaveRecognition: (payload: UserRecognitionUpdatePayload) => Promise<void>;
  recognitionBusy: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [region, setRegion] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [badgesText, setBadgesText] = useState("");
  const [verified, setVerified] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = Boolean(profile && currentProfile && profile.id === currentProfile.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }
    setFullName(profile.full_name);
    setBio(profile.bio ?? "");
    setRegion(profile.region_label);
    setAvatarUrl(profile.avatar_url ?? "");
    setBadgesText(profile.badges.join(", "));
    setVerified(profile.is_verified);
    setError(null);
  }, [profile]);

  useEffect(() => {
    if (!open) {
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-[2rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_35px_90px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--card-border)] px-6 py-5">
          {profile ? (
            <div className="flex items-center gap-4">
              <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} className="h-16 w-16 text-lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)]">{profile.full_name}</h3>
                  {profile.is_verified ? <VerifiedMark /> : null}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{profile.role} • {profile.region_label}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{profile.green_thumb_karma} karma</p>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Profile</h3>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] text-[var(--text-secondary)]"
            aria-label="Close profile"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[var(--text-secondary)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !profile ? null : (
            <>
          <BadgeRow badges={profile.badges} />

          {profile.bio ? <p className="text-sm leading-7 text-[var(--text-secondary)]">{profile.bio}</p> : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {isOwnProfile ? (
            <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--bg-secondary)]/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Edit profile</p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                  <ImagePlus className="h-3.5 w-3.5" />
                  Avatar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }
                      try {
                        setAvatarUrl(await readFileAsDataUrl(file));
                        setError(null);
                      } catch (fileError) {
                        setError(fileError instanceof Error ? fileError.message : "Unable to load avatar.");
                      } finally {
                        event.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Name" />
                <Input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Region" />
              </div>
              <Input className="mt-3" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="Avatar URL or uploaded image" />
              <Textarea className="mt-3 min-h-28 rounded-[1.25rem]" value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Short bio" />

              <div className="mt-3 flex justify-end">
                <Button
                  disabled={savingProfile}
                  onClick={async () => {
                    setSavingProfile(true);
                    setError(null);
                    try {
                      await onSaveProfile({
                        full_name: fullName.trim(),
                        avatar_url: avatarUrl.trim(),
                        bio: bio.trim(),
                        region_label: region.trim()
                      });
                    } catch (saveError) {
                      setError(saveError instanceof Error ? saveError.message : "Unable to update profile.");
                    } finally {
                      setSavingProfile(false);
                    }
                  }}
                >
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          ) : null}

          {canGrantBadges || canVerify ? (
            <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--bg-secondary)]/70 p-4">
              <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Recognition</p>
              {canGrantBadges ? (
                <Input value={badgesText} onChange={(event) => setBadgesText(event.target.value)} placeholder="Badges, comma separated" />
              ) : null}
              {canVerify ? (
                <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  <input checked={verified} onChange={(event) => setVerified(event.target.checked)} type="checkbox" />
                  Verified
                </label>
              ) : null}
              <div className="mt-3 flex justify-end">
                <Button
                  disabled={recognitionBusy}
                  onClick={async () => {
                    try {
                      await onSaveRecognition({
                        badges: canGrantBadges
                          ? badgesText
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean)
                          : undefined,
                        is_verified: canVerify ? verified : undefined
                      });
                    } catch (saveError) {
                      setError(saveError instanceof Error ? saveError.message : "Unable to update recognition.");
                    }
                  }}
                >
                  {recognitionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Apply
                </Button>
              </div>
            </div>
          ) : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ThreadSheet({
  thread,
  open,
  onClose,
  profile,
  onReload,
  error,
  setError
}: {
  thread: CommunityThreadResponse | null;
  open: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onReload: () => Promise<void>;
  error: string | null;
  setError: (value: string | null) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState("");
  const token = getStoredAccessToken() ?? undefined;
  const canModerate = Boolean(profile?.is_community_moderator || profile?.role === "admin" || profile?.role === "developer");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!mounted || !open || !thread) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[115] flex justify-end bg-slate-950/30 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col border-l border-[var(--card-border)] bg-[var(--bg-primary)] shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--card-border)] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Discussion</p>
            <h3 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{thread.post.title}</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {thread.post.author.full_name} • {formatRelativeTime(thread.post.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] text-[var(--text-secondary)]"
            aria-label="Close discussion"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
          <Card className="mb-5 rounded-[1.5rem] bg-[var(--card-bg)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-primary)]">{thread.post.body_markdown}</p>
          </Card>

          <div className="mb-5 rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a comment"
              className="min-h-28 rounded-[1.2rem]"
            />
            <div className="mt-3 flex justify-end">
              <Button
                disabled={!token || !draft.trim()}
                onClick={async () => {
                  if (!token || !draft.trim()) {
                    return;
                  }

                  try {
                    await createCommunityComment({
                      token,
                      postId: thread.post.id,
                      payload: {body_markdown: draft.trim()}
                    });
                    setDraft("");
                    setError(null);
                    await onReload();
                  } catch (commentError) {
                    setError(commentError instanceof Error ? commentError.message : "Unable to add comment.");
                  }
                }}
              >
                Comment
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <CommentTree
            comments={thread.comments}
            solutionCommentId={thread.post.solution_comment_id}
            canMarkSolution={Boolean(token && profile && (profile.id === thread.post.author.id || canModerate))}
            onVote={async (commentId, value) => {
              if (!token) {
                setError("Please sign in to vote.");
                return;
              }
              await voteCommunityComment({token, commentId, value});
              await onReload();
            }}
            onReply={async (parentId, body) => {
              if (!token) {
                setError("Please sign in to reply.");
                return;
              }
              await createCommunityComment({
                token,
                postId: thread.post.id,
                payload: {body_markdown: body, parent_id: parentId}
              });
              await onReload();
            }}
            onReport={async (commentId) => {
              if (!token) {
                setError("Please sign in to report comments.");
                return;
              }
              await submitCommunityReport({
                token,
                target_type: "comment",
                target_comment_id: commentId,
                reason: "inappropriate"
              });
            }}
            onMarkSolution={async (commentId) => {
              if (!token) {
                setError("Please sign in to update the solution.");
                return;
              }
              await markCommunitySolution({token, postId: thread.post.id, commentId});
              await onReload();
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function CommunityExperience({profile, initialPostId}: CommunityExperienceProps) {
  const token = useMemo(() => getStoredAccessToken() ?? undefined, []);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(profile);
  const canModerate = Boolean(currentProfile?.is_community_moderator || currentProfile?.role === "admin" || currentProfile?.role === "developer");
  const canGrantBadges = Boolean(currentProfile && ["expert", "admin", "developer"].includes(currentProfile.role));
  const canVerify = Boolean(currentProfile && ["admin", "developer"].includes(currentProfile.role));

  const [sort, setSort] = useState<CommunityFeedSort>("hot");
  const [feed, setFeed] = useState<CommunityPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [thread, setThread] = useState<CommunityThreadResponse | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(initialPostId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [recognitionBusy, setRecognitionBusy] = useState(false);

  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);

  const loadFeed = useCallback(
    async (reset: boolean) => {
      setError(null);
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await fetchCommunityFeed({
          sort,
          cursor: reset ? undefined : cursor ?? undefined,
          limit: 10,
          region: currentProfile?.private_feed_enabled ? currentProfile.region_label : undefined,
          token
        });

        setFeed((prev) => (reset ? response.items : [...prev, ...response.items]));
        setCursor(response.next_cursor);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load the community feed.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cursor, currentProfile?.private_feed_enabled, currentProfile?.region_label, sort, token]
  );

  const openProfile = useCallback(
    async (userId: string) => {
      if (!token) {
        setError("Please sign in to view profiles.");
        return;
      }

      if (currentProfile?.id === userId) {
        setActiveProfile(currentProfile);
        setProfileOpen(true);
        return;
      }

      setProfileLoading(true);
      setProfileOpen(true);
      try {
        const nextProfile = await fetchUserProfile({token, userId});
        setActiveProfile(nextProfile);
        setError(null);
      } catch (profileError) {
        setProfileOpen(false);
        setError(profileError instanceof Error ? profileError.message : "Unable to load profile.");
      } finally {
        setProfileLoading(false);
      }
    },
    [currentProfile, token]
  );

  const syncUpdatedProfile = useCallback((updatedProfile: UserProfile) => {
    setFeed((prev) => applyProfileToFeed(prev, updatedProfile));
    setThread((prev) =>
      prev
        ? {
            ...prev,
            post: {
              ...prev.post,
              author: applyProfileToAuthor(prev.post.author, updatedProfile),
              featured_comment: prev.post.featured_comment
                ? {
                    ...prev.post.featured_comment,
                    author: applyProfileToAuthor(prev.post.featured_comment.author, updatedProfile)
                  }
                : null
            },
            comments: applyProfileToComments(prev.comments, updatedProfile)
          }
        : prev
    );
    setActiveProfile((prev) => (prev?.id === updatedProfile.id ? updatedProfile : prev));
    if (currentProfile?.id === updatedProfile.id) {
      setCurrentProfile(updatedProfile);
    }
  }, [currentProfile?.id]);

  const loadThread = useCallback(
    async (postId: string) => {
      try {
        const response = await fetchCommunityThread({postId, token});
        setThread(response);
        setSelectedPostId(postId);
        setThreadOpen(true);
      } catch (threadError) {
        setError(threadError instanceof Error ? threadError.message : "Unable to load the discussion.");
      }
    },
    [token]
  );

  useEffect(() => {
    void loadFeed(true);
  }, [sort, loadFeed]);

  useEffect(() => {
    if (!initialPostId) {
      return;
    }
    void loadThread(initialPostId);
  }, [initialPostId, loadThread]);

  useEffect(() => {
    if (!canModerate || !token) {
      return;
    }

    setReportsLoading(true);
    void fetchModerationReports({token, status: "open", limit: 8})
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setReportsLoading(false));
  }, [canModerate, token]);

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,740px)_300px] xl:justify-center">
        <section className="min-h-0 overflow-auto rounded-[1.75rem] bg-transparent">
          <div className="mx-auto flex max-w-[740px] flex-col gap-3">

            <div className="sticky top-0 z-20 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 shadow-[var(--shadow-sm)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFeed([]);
                      setCursor(null);
                      setSort("hot");
                    }}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      sort === "hot" ? "text-white" : "text-[var(--text-secondary)]"
                    )}
                    style={sort === "hot" ? {backgroundColor: "var(--accent)"} : undefined}
                  >
                    Top
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFeed([]);
                      setCursor(null);
                      setSort("recent");
                    }}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      sort === "recent" ? "text-white" : "text-[var(--text-secondary)]"
                    )}
                    style={sort === "recent" ? {backgroundColor: "var(--accent)"} : undefined}
                  >
                    Recent
                  </button>
                </div>

                <Button onClick={() => setComposerOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New post
                </Button>
              </div>
            </div>

            <Card className="rounded-[1.2rem] border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => void openProfile(currentProfile?.id ?? "")} disabled={!currentProfile}>
                  <Avatar name={currentProfile?.full_name ?? "Plantify member"} avatarUrl={currentProfile?.avatar_url} className="h-11 w-11 text-sm" />
                </button>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="flex-1 rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] px-5 py-3 text-left text-sm text-[var(--text-secondary)] transition hover:border-[var(--ring)]/30 hover:text-[var(--text-primary)]"
                >
                  What&apos;s new?
                </button>
              </div>
            </Card>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="flex justify-center py-14 text-[var(--text-secondary)]">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4 pb-8">
                {feed.map((post) => (
                  <Card key={post.id} className="overflow-hidden rounded-[1.2rem] border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-sm)]">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="flex min-w-0 gap-3">
                        <button type="button" onClick={() => void openProfile(post.author.id)} className="shrink-0">
                          <Avatar name={post.author.full_name} avatarUrl={post.author.avatar_url} className="h-12 w-12 text-base" />
                        </button>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => void openProfile(post.author.id)} className="truncate text-sm font-semibold text-[var(--text-primary)]">
                              {post.author.full_name}
                            </button>
                            {post.author.is_verified ? <VerifiedMark /> : null}
                            <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                              {post.author.role}
                            </span>
                          </div>
                          <div className="mt-1">
                            <BadgeRow badges={post.author.badges} />
                          </div>
                          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                            {formatRelativeTime(post.created_at)} • {post.region_label}
                          </p>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                        <Globe2 className="h-3.5 w-3.5" />
                        {post.is_private ? "Private" : "Public"}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h2 className="text-[1.45rem] font-semibold leading-tight text-[var(--text-primary)]">{post.title}</h2>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{post.body_markdown}</p>
                    </div>

                    <MediaCarousel post={post} />

                    {post.featured_comment ? (
                      <FeaturedCommentCard
                        comment={post.featured_comment}
                        onOpenProfile={(userId) => void openProfile(userId)}
                        onOpenThread={() => void loadThread(post.id)}
                      />
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--card-border)] pt-4">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!token) {
                            setError("Please sign in to vote.");
                            return;
                          }
                          const votes = await voteCommunityPost({token, postId: post.id, value: 1});
                          setFeed((prev) => prev.map((item) => (item.id === post.id ? {...item, votes} : item)));
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {post.votes.upvotes}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!token) {
                            setError("Please sign in to vote.");
                            return;
                          }
                          const votes = await voteCommunityPost({token, postId: post.id, value: -1});
                          setFeed((prev) => prev.map((item) => (item.id === post.id ? {...item, votes} : item)));
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        {post.votes.downvotes}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!token) {
                            setError("Please sign in to save posts.");
                            return;
                          }
                          const result = await toggleCommunityBookmark({token, postId: post.id});
                          setFeed((prev) =>
                            prev.map((item) =>
                              item.id === post.id
                                ? {
                                    ...item,
                                    viewer_bookmarked: result.bookmarked,
                                    bookmark_count: Math.max(0, item.bookmark_count + (result.bookmarked ? 1 : -1))
                                  }
                                : item
                            )
                          );
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      >
                        <Bookmark className={cn("h-4 w-4", post.viewer_bookmarked && "fill-current")}/>
                        {post.bookmark_count}
                      </button>

                      <button
                        type="button"
                        onClick={() => void loadThread(post.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {post.comment_count}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!token) {
                            setError("Please sign in to report posts.");
                            return;
                          }
                          await submitCommunityReport({token, target_type: "post", target_post_id: post.id, reason: "inappropriate"});
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      >
                        <Flag className="h-4 w-4" />
                        Report
                      </button>

                      <AppLink href={`/community/post/${post.id}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">
                        Open thread
                      </AppLink>
                    </div>
                  </Card>
                ))}

                {cursor ? (
                  <div className="flex justify-center pt-2">
                    <Button variant="secondary" disabled={loadingMore} onClick={() => void loadFeed(false)}>
                      {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {loadingMore ? "Loading" : "Load more posts"}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <aside className="hidden min-h-0 overflow-auto xl:block">
          <div className="sticky top-0 space-y-4 pb-6">
            {currentProfile ? (
              <Card className="rounded-[1.65rem] border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => void openProfile(currentProfile.id)}>
                    <Avatar name={currentProfile.full_name} avatarUrl={currentProfile.avatar_url} className="h-14 w-14 text-base" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => void openProfile(currentProfile.id)} className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {currentProfile.full_name}
                      </button>
                      {currentProfile.is_verified ? <VerifiedMark /> : null}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{currentProfile.region_label}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{currentProfile.green_thumb_karma} karma</p>
                  </div>
                </div>
                <div className="mt-3">
                  <BadgeRow badges={currentProfile.badges} />
                </div>
              </Card>
            ) : null}

            {canModerate ? (
              <Card className="rounded-[1.65rem] border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Moderation queue</p>
                </div>

                {reportsLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading reports
                  </div>
                ) : reports.length === 0 ? (
                  <p className="mt-4 text-sm text-[var(--text-secondary)]">No open reports right now.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {reports.map((report) => (
                      <li key={report.id} className="rounded-[1rem] border border-[var(--card-border)] bg-[var(--bg-secondary)]/70 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{report.target_type === "post" ? "Post report" : "Comment report"}</p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">{report.reason}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {(["reviewing", "resolved", "dismissed"] as CommunityReportStatus[]).map((state) => (
                            <button
                              key={state}
                              type="button"
                              onClick={async () => {
                                if (!token) {
                                  return;
                                }
                                await reviewModerationReport({token, reportId: report.id, status: state});
                                const refreshed = await fetchModerationReports({token, status: "open", limit: 8});
                                setReports(refreshed);
                              }}
                              className="rounded-full border border-[var(--card-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]"
                            >
                              {state}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ) : null}
          </div>
        </aside>
      </div>

      <ComposerModal open={composerOpen} onClose={() => setComposerOpen(false)} profile={currentProfile} onPublish={async () => {
        await loadFeed(true);
      }} />

      <ProfileModal
        open={profileOpen}
        onClose={() => {
          setProfileOpen(false);
          setActiveProfile(null);
        }}
        loading={profileLoading}
        profile={activeProfile}
        currentProfile={currentProfile}
        canGrantBadges={canGrantBadges}
        canVerify={canVerify}
        recognitionBusy={recognitionBusy}
        onSaveProfile={async (payload) => {
          if (!token || !currentProfile) {
            throw new Error("Please sign in to edit your profile.");
          }
          const updatedProfile = await updateMyProfile({token, payload});
          syncUpdatedProfile(updatedProfile);
        }}
        onSaveRecognition={async (payload) => {
          if (!token || !activeProfile) {
            throw new Error("Please sign in to update recognition.");
          }
          setRecognitionBusy(true);
          try {
            const updatedProfile = await updateUserRecognition({token, userId: activeProfile.id, payload});
            syncUpdatedProfile(updatedProfile);
          } finally {
            setRecognitionBusy(false);
          }
        }}
      />

      <ThreadSheet
        thread={thread}
        open={threadOpen}
        onClose={() => setThreadOpen(false)}
        profile={currentProfile}
        error={error}
        setError={setError}
        onReload={async () => {
          if (!selectedPostId) {
            return;
          }
          await loadThread(selectedPostId);
          await loadFeed(true);
        }}
      />
    </>
  );
}