import type {
  AuthTokens,
  DashboardStats,
  DetectionResult,
  RoleCodeUpdatePayload,
  ScanHistory,
  UserProfile,
  UserRole,
  UserRoleUpdatePayload
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
const ACCESS_TOKEN_KEY = "plantify_access_token";
const REFRESH_TOKEN_KEY = "plantify_refresh_token";
const ROLE_KEY = "plantify_user_role";

export function getStoredAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeAuthTokens(tokens: AuthTokens): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearStoredTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearStoredRole();
}

export function getStoredRole(): UserRole | null {
  const value = window.localStorage.getItem(ROLE_KEY);
  if (value === "farmer" || value === "expert" || value === "admin" || value === "developer") {
    return value;
  }
  return null;
}

export function storeUserRole(role: UserRole): void {
  window.localStorage.setItem(ROLE_KEY, role);
}

export function clearStoredRole(): void {
  window.localStorage.removeItem(ROLE_KEY);
}

export function inferRoleFromProfile(profile: UserProfile): UserRole {
  return profile.role;
}

function authHeaders(token?: string): HeadersInit {
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const message = await readErrorMessage(res, "Invalid credentials");
    throw new Error(message);
  }

  return res.json() as Promise<AuthTokens>;
}

export async function refreshAccessToken(): Promise<AuthTokens | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!res.ok) {
    clearStoredTokens();
    return null;
  }

  const tokens = (await res.json()) as AuthTokens;
  storeAuthTokens(tokens);
  return tokens;
}

async function authFetch(
  buildRequest: (token: string) => Promise<Response>,
  token?: string
): Promise<Response> {
  const initialToken = token ?? getStoredAccessToken();
  if (!initialToken) {
    throw new Error("Unauthorized");
  }

  let response = await buildRequest(initialToken);
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    throw new Error("Session expired. Please sign in again.");
  }

  response = await buildRequest(refreshed.access_token);
  return response;
}

export async function logoutCurrentSession(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearStoredTokens();
    return;
  }

  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  } finally {
    clearStoredTokens();
  }
}

export async function signup(payload: { email: string; full_name: string; password: string }) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const message = await readErrorMessage(res, "Unable to create account");
    throw new Error(message);
  }

  return res.json() as Promise<UserProfile>;
}

async function readErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string | Array<{ msg?: string }> };
    if (typeof payload.detail === "string" && payload.detail.trim().length > 0) {
      return payload.detail;
    }

    if (Array.isArray(payload.detail) && payload.detail.length > 0) {
      const firstMessage = payload.detail[0]?.msg;
      if (typeof firstMessage === "string" && firstMessage.trim().length > 0) {
        return firstMessage;
      }
    }
  } catch {
    // Keep fallback when server response is not JSON.
  }

  return fallbackMessage;
}

export async function fetchProfile(token: string): Promise<UserProfile> {
  const res = await authFetch(async (authToken) =>
    fetch(`${API_BASE}/users/me`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    throw new Error("Unauthorized");
  }

  return res.json() as Promise<UserProfile>;
}

export async function fetchUsers(token: string): Promise<UserProfile[]> {
  const res = await authFetch(async (authToken) =>
    fetch(`${API_BASE}/users`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    throw new Error("Failed to load users");
  }

  return res.json() as Promise<UserProfile[]>;
}

export async function updateUserRole(input: {
  token: string;
  userId: string;
  payload: UserRoleUpdatePayload;
}): Promise<UserProfile> {
  const res = await authFetch(async (authToken) =>
    fetch(`${API_BASE}/users/${input.userId}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(authToken)
      },
      body: JSON.stringify(input.payload)
    }),
    input.token
  );

  if (!res.ok) {
    throw new Error("Failed to update user role");
  }

  return res.json() as Promise<UserProfile>;
}

export async function redeemRoleByCode(input: {
  token: string;
  payload: RoleCodeUpdatePayload;
}): Promise<UserProfile> {
  const res = await authFetch(async (authToken) =>
    fetch(`${API_BASE}/users/self/role/by-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(authToken)
      },
      body: JSON.stringify(input.payload)
    }),
    input.token
  );

  if (!res.ok) {
    const message = await readErrorMessage(res, "Failed to apply role code");
    throw new Error(message);
  }

  return res.json() as Promise<UserProfile>;
}

export async function fetchHistory(token: string): Promise<ScanHistory[]> {
  const res = await authFetch(async (authToken) =>
    fetch(`${API_BASE}/dashboard/history`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    throw new Error("Failed to load history");
  }

  return res.json() as Promise<ScanHistory[]>;
}

export async function fetchStats(token: string): Promise<DashboardStats> {
  const res = await authFetch(async (authToken) =>
    fetch(`${API_BASE}/dashboard/stats`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    throw new Error("Failed to load stats");
  }

  return res.json() as Promise<DashboardStats>;
}

export async function fetchTips(token: string): Promise<string[]> {
  const res = await authFetch(async (authToken) =>
    fetch(`${API_BASE}/dashboard/tips`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    throw new Error("Failed to load tips");
  }

  return res.json() as Promise<string[]>;
}

export async function detectPlant(input: {
  token: string;
  image: File;
  segmented?: File;
  domain: string;
}): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append("image", input.image);
  formData.append("domain", input.domain);
  if (input.segmented) {
    formData.append("segmented_image", input.segmented);
  }

  const res = await authFetch(async (authToken) =>
    fetch(`${API_BASE}/detect`, {
      method: "POST",
      headers: {
        ...authHeaders(authToken)
      },
      body: formData
    }),
    input.token
  );

  if (!res.ok) {
    throw new Error("Detection failed");
  }

  return res.json() as Promise<DetectionResult>;
}
