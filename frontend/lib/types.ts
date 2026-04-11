export interface DetectionResult {
  disease_type: string;
  plant_name: string;
  disease: string;
  confidence_score: number;
  treatment_recommendations: string;
  domain: string;
  image_sha256?: string | null;
  before_image_b64?: string | null;
  after_image_b64?: string | null;
}

export interface ScanHistory {
  id: string;
  disease_type: string;
  plant_name: string;
  disease: string;
  confidence_score: number;
  recommendation: string;
  domain: string;
  created_at: string;
  before_image_b64?: string | null;
}

export interface DashboardStats {
  total_scans: number;
  healthy_ratio: number;
  top_disease: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  region_label: string;
  private_feed_enabled: boolean;
  is_community_moderator: boolean;
  is_verified: boolean;
  badges: string[];
  green_thumb_karma: number;
  created_at: string;
}

export type UserRole = "farmer" | "expert" | "admin" | "developer";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserRoleUpdatePayload {
  role: UserRole;
}

export interface RoleCodeUpdatePayload {
  code: string;
  role: UserRole;
}

export type CommunityFeedSort = "recent" | "hot";
export type CommunityMediaType = "image" | "video";
export type CommunityVoteValue = -1 | 1;
export type CommunityReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type CommunityReportTargetType = "post" | "comment";

export interface CommunityAuthorBrief {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  region_label: string;
  is_verified: boolean;
  badges: string[];
  green_thumb_karma: number;
}

export interface CommunityVoteSummary {
  upvotes: number;
  downvotes: number;
  score: number;
  viewer_vote: number;
}

export interface CommunityPostMedia {
  id: string;
  media_type: CommunityMediaType;
  media_url: string;
  position: number;
}

export interface CommunityFeaturedComment {
  id: string;
  post_id: string;
  body_markdown: string;
  created_at: string;
  is_solution: boolean;
  author: CommunityAuthorBrief;
  votes: CommunityVoteSummary;
}

export interface CommunityPost {
  id: string;
  title: string;
  body_markdown: string;
  region_label: string;
  is_private: boolean;
  comment_count: number;
  bookmark_count: number;
  created_at: string;
  updated_at: string;
  solution_comment_id: string | null;
  deep_link: string;
  author: CommunityAuthorBrief;
  media: CommunityPostMedia[];
  votes: CommunityVoteSummary;
  featured_comment: CommunityFeaturedComment | null;
  viewer_bookmarked: boolean;
  hot_score: number;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  depth: number;
  body_markdown: string;
  created_at: string;
  updated_at: string;
  is_solution: boolean;
  replies_count: number;
  author: CommunityAuthorBrief;
  votes: CommunityVoteSummary;
  replies: CommunityComment[];
}

export interface CommunityFeedResponse {
  sort: CommunityFeedSort;
  next_cursor: string | null;
  items: CommunityPost[];
}

export interface CommunityThreadResponse {
  post: CommunityPost;
  comments: CommunityComment[];
  focused_comment_id: string | null;
}

export interface CommunityPostMediaInput {
  media_type: CommunityMediaType;
  media_url: string;
}

export interface CommunityCreatePostInput {
  title: string;
  body_markdown: string;
  media: CommunityPostMediaInput[];
  region_label: string;
  is_private: boolean;
}

export interface CommunityCreateCommentInput {
  body_markdown: string;
  parent_id?: string;
}

export interface UserProfileUpdatePayload {
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  region_label?: string;
}

export interface UserRecognitionUpdatePayload {
  badges?: string[];
  is_verified?: boolean;
}

export interface CommunityReport {
  id: string;
  target_type: CommunityReportTargetType;
  target_post_id: string | null;
  target_comment_id: string | null;
  reason: string;
  details: string | null;
  status: CommunityReportStatus;
  reporter_user_id: string;
  reviewed_by_user_id: string | null;
  moderator_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}
