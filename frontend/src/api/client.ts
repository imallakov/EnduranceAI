/// <reference types="vite/client" />
import axios, { type AxiosRequestConfig } from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

// ── Auth model ────────────────────────────────────────────────────────────
// The ACCESS token lives in memory only (a module variable), never in
// localStorage — so an XSS payload can't read it out of storage, and it's
// short-lived anyway. The long-lived REFRESH token is an httpOnly cookie the
// browser attaches automatically (withCredentials); JS can't read it at all.
let accessToken: string | null = null;
export function setAccessToken(token: string | null): void {
  accessToken = token;
}
export function getAccessToken(): string | null {
  return accessToken;
}

// IMPORTANT: do NOT set a default Content-Type here. Axios auto-detects the
// right value per request body (object→json, FormData→multipart, string→text);
// a hard-coded default would break the multipart boundary on file uploads.
export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send/receive the httpOnly refresh cookie
});

// Attach the in-memory access token to every request.
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Token refresh — single-flight ─────────────────────────────────────────
// One in-flight refresh that all concurrent 401-callers await, so parallel
// requests don't each fire a refresh (which, with rotation + blacklist, would
// invalidate each other). The refresh token rides in the httpOnly cookie, so
// the request carries no body — just credentials.
let refreshInFlight: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      // Bare axios (not apiClient) to skip our own interceptors; withCredentials
      // so the browser sends the httpOnly refresh cookie.
      const { data } = await axios.post(
        `${BASE_URL}/api/auth/token/refresh/`, {}, { withCredentials: true },
      );
      accessToken = data.access as string;
      return accessToken;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// Response interceptor — on 401, refresh the access token once and retry.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original: (AxiosRequestConfig & { _retry?: boolean }) | undefined = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      // Avoid an infinite loop if the refresh endpoint itself returns 401.
      !(original.url ?? '').includes('/api/auth/token/refresh/')
    ) {
      original._retry = true;
      try {
        const newAccess = await refreshAccessToken();
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
        return apiClient(original);
      } catch {
        // Refresh failed — the cookie is gone/expired/blacklisted. Drop the
        // in-memory token and bounce to login (router not reachable here).
        accessToken = null;
        const path = window.location.pathname;
        if (!path.startsWith('/login') && !path.startsWith('/register')) {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  },
);
