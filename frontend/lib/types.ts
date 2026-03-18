export interface DetectionResult {
  disease_type: string;
  confidence_score: number;
  treatment_recommendations: string;
  domain: string;
  before_image_b64?: string | null;
  after_image_b64?: string | null;
}

export interface ScanHistory {
  id: string;
  disease_type: string;
  confidence_score: number;
  recommendation: string;
  domain: string;
  created_at: string;
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
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
