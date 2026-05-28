/// <reference types="vite/client" />
import axios, { type AxiosRequestConfig } from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

// IMPORTANT: do NOT set a default Content-Type here. Axios auto-detects
// the right value per request body type:
//   - plain object  →  application/json
//   - FormData      →  multipart/form-data; boundary=...
//   - string        →  text/plain
// A hard-coded default would override the multipart boundary and break
// every file upload with "No file provided" on the backend.
export const apiClient = axios.create({
  baseURL: BASE_URL,
});

// JWT request interceptor — attaches token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Token refresh — single-flight + rotation-aware ────────────────────
//
// Backend has ROTATE_REFRESH_TOKENS=True + BLACKLIST_AFTER_ROTATION=True,
// so each successful refresh issues a NEW refresh token AND blacklists
// the old one. Two failure modes if not handled:
//
//   1. We forget to save the new refresh → next refresh sends a
//      blacklisted token → 401 → user kicked out.
//   2. Multiple concurrent 401s (e.g. parallel Dashboard requests) fire
//      multiple refresh requests in parallel. Backend blacklists the
//      original refresh after the first one wins; the other 2-3 fail.
//
// Solution: a single in-flight refresh promise that all 401-callers wait
// on. The first 401 starts the refresh; everyone else awaits the same
// promise and re-uses the new access token.

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) throw new Error('No refresh token');

  refreshInFlight = (async () => {
    try {
      // Use bare axios (not apiClient) to avoid recursing through our
      // own interceptor while we're still inside it.
      const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, { refresh });
      localStorage.setItem('access_token', data.access);
      // SimpleJWT returns a new refresh on every rotation — must persist it
      // or the next call will send a blacklisted token.
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      return data.access as string;
    } finally {
      // Clear immediately so the NEXT 401 (after a future expiry) starts
      // a fresh refresh — not awaits a stale resolved promise.
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// JWT response interceptor — refresh access on 401, retry the original
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original: (AxiosRequestConfig & { _retry?: boolean }) | undefined = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      // Avoid infinite loop if the refresh endpoint itself returns 401
      !(original.url ?? '').includes('/api/auth/token/refresh/')
    ) {
      original._retry = true;
      try {
        const newAccess = await refreshAccessToken();
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
        return apiClient(original);
      } catch {
        // Refresh failed — refresh is genuinely expired/blacklisted.
        // Clear everything so the user has to log in again.
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Hard-redirect to login (router not accessible from here).
        // Only redirect if we're not already on login/register to avoid loop.
        const path = window.location.pathname;
        if (!path.startsWith('/login') && !path.startsWith('/register')) {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);
