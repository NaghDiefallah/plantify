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
import {getApiUrl, getPlatform, isNativeMobilePlatform} from "@/lib/platform";

const API_BASE = getApiUrl();
const API_BASE_STORAGE_KEY = "plantify_api_base";
const ACCESS_TOKEN_KEY = "plantify_access_token";
const REFRESH_TOKEN_KEY = "plantify_refresh_token";
const ROLE_KEY = "plantify_user_role";
export const AUTH_STATE_CHANGED_EVENT = "plantify-auth-state-changed";

let activeApiBase = API_BASE;

function emitAuthStateChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
  }
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getStoredAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeAuthTokens(tokens: AuthTokens): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  emitAuthStateChanged();
}

export function clearStoredTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearStoredRole();
  emitAuthStateChanged();
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

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getPersistedApiBase(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(API_BASE_STORAGE_KEY)?.trim();
  if (!stored) {
    return null;
  }

  return stored;
}

function setPersistedApiBase(base: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(API_BASE_STORAGE_KEY, base);
}

function dedupeBases(bases: string[]): string[] {
  const normalized: string[] = [];
  for (const base of bases) {
    const value = base.trim().replace(/\/+$/, "");
    if (!value) {
      continue;
    }
    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }
  return normalized;
}

function getApiBaseCandidates(originalBase: string): string[] {
  const candidates: string[] = [];
  const persisted = getPersistedApiBase();
  if (persisted) {
    candidates.push(persisted);
  }

  candidates.push(activeApiBase, originalBase);

  if (typeof window !== "undefined") {
    const platform = getPlatform();
    if (platform === "desktop") {
      candidates.push("http://127.0.0.1:8000/api", "http://localhost:8000/api");
    }

    if (platform === "android") {
      const mobileDev = process.env.NEXT_PUBLIC_MOBILE_DEV_API_URL?.trim();
      if (mobileDev) {
        candidates.push(mobileDev);
      }
      candidates.push("http://10.0.2.2:8000/api", "http://192.168.1.50:8000/api", "http://localhost:8000/api");
    }
  }

  return dedupeBases(candidates);
}

function toUrlString(input: RequestInfo | URL): string | null {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return null;
}

function replaceApiBase(url: string, fromBase: string, toBase: string): string {
  return url.startsWith(fromBase) ? `${toBase}${url.slice(fromBase.length)}` : url;
}

function rememberWorkingApiBase(base: string): void {
  activeApiBase = base;
  setPersistedApiBase(base);
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("X-Request-ID")) {
    headers.set("X-Request-ID", generateRequestId());
  }

  const originalUrl = toUrlString(input);
  const candidates = getApiBaseCandidates(API_BASE);
  const preferredBase = candidates[0] ?? API_BASE;
  const firstUrl = originalUrl ? replaceApiBase(originalUrl, API_BASE, preferredBase) : null;
  const firstInput: RequestInfo | URL = firstUrl ?? input;

  try {
    const response = await fetch(firstInput, { ...init, headers });
    if (originalUrl && firstUrl && firstUrl !== originalUrl) {
      rememberWorkingApiBase(preferredBase);
    }
    return response;
  } catch {
    if (!originalUrl) {
      throw new Error(resolveBackendUnavailableMessage());
    }

    for (const candidateBase of candidates.slice(1)) {
      const nextUrl = replaceApiBase(originalUrl, API_BASE, candidateBase);
      if (nextUrl === originalUrl) {
        continue;
      }

      try {
        const response = await fetch(nextUrl, {...init, headers});
        rememberWorkingApiBase(candidateBase);
        return response;
      } catch {
        // Try next candidate.
      }
    }

    throw new Error(resolveBackendUnavailableMessage());
  }
}

function resolveBackendUnavailableMessage(): string {
  if (typeof window !== "undefined" && isNativeMobilePlatform()) {
    return "Unable to reach Plantify backend. Verify the phone and API server are on the same network and the mobile API URL is correct.";
  }

  if (typeof window !== "undefined" && isLocalHostname(window.location.hostname)) {
    return "Unable to reach Plantify backend. Please start backend server on port 8000.";
  }

  return "Unable to reach Plantify backend. Please verify the deployed API is reachable.";
}

export function logApiError(context: {
  endpoint: string;
  status: number;
  message: string;
  requestId?: string;
}): void {
  const entry = { ts: new Date().toISOString(), ...context };
  console.error(JSON.stringify(entry));
}

async function handleApiError(
  res: Response,
  endpoint: string,
  fallbackMessage: string
): Promise<never> {
  const requestId = res.headers.get("x-request-id") ?? undefined;
  const message = await readErrorMessage(res, fallbackMessage);
  logApiError({ endpoint, status: res.status, message, requestId });
  throw new Error(message);
}

export async function login(email: string, password: string) {
  const res = await apiFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    await handleApiError(res, "auth/login", "Invalid credentials");
  }

  return res.json() as Promise<AuthTokens>;
}

export async function refreshAccessToken(): Promise<AuthTokens | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const res = await apiFetch(`${API_BASE}/auth/refresh`, {
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
    await apiFetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  } finally {
    clearStoredTokens();
  }
}

export async function signup(payload: { email: string; full_name: string; password: string }) {
  const res = await apiFetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    await handleApiError(res, "auth/signup", "Unable to create account");
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
    apiFetch(`${API_BASE}/users/me`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "users/me", "Unauthorized");
  }

  return res.json() as Promise<UserProfile>;
}

export async function fetchUsers(token: string): Promise<UserProfile[]> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/users`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "users", "Failed to load users");
  }

  return res.json() as Promise<UserProfile[]>;
}

export async function updateUserRole(input: {
  token: string;
  userId: string;
  payload: UserRoleUpdatePayload;
}): Promise<UserProfile> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/users/${input.userId}/role`, {
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
    await handleApiError(res, "users/role", "Failed to update user role");
  }

  return res.json() as Promise<UserProfile>;
}

export async function redeemRoleByCode(input: {
  token: string;
  payload: RoleCodeUpdatePayload;
}): Promise<UserProfile> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/users/self/role/by-code`, {
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
    await handleApiError(res, "users/role/by-code", "Failed to apply role code");
  }

  return res.json() as Promise<UserProfile>;
}

export async function fetchHistory(token: string): Promise<ScanHistory[]> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/dashboard/history`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "dashboard/history", "Failed to load history");
  }

  return res.json() as Promise<ScanHistory[]>;
}

export async function fetchStats(token: string): Promise<DashboardStats> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/dashboard/stats`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "dashboard/stats", "Failed to load stats");
  }

  return res.json() as Promise<DashboardStats>;
}

export async function fetchTips(token: string): Promise<string[]> {
  const res = await authFetch(async (authToken) =>
    apiFetch(`${API_BASE}/dashboard/tips`, {
      headers: {
        ...authHeaders(authToken)
      }
    }),
    token
  );

  if (!res.ok) {
    await handleApiError(res, "dashboard/tips", "Failed to load tips");
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
    apiFetch(`${API_BASE}/detect`, {
      method: "POST",
      headers: {
        ...authHeaders(authToken)
      },
      body: formData
    }),
    input.token
  );

  if (!res.ok) {
    await handleApiError(res, "detect", "Detection failed");
  }

  return res.json() as Promise<DetectionResult>;
}
