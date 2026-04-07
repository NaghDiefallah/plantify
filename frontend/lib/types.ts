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
  role: UserRole;
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
