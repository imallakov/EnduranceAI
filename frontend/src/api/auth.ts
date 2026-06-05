import { apiClient, setAccessToken } from './client';
import type { AuthResponse, UserProfile, LoginPayload, RegisterPayload } from '../types/api';

export async function login(payload: LoginPayload): Promise<UserProfile> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/login/', payload);
  setAccessToken(data.access);   // refresh token arrives as an httpOnly cookie
  return data.user;
}

export async function register(payload: RegisterPayload): Promise<UserProfile> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/register/', payload);
  setAccessToken(data.access);
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    // The refresh cookie is sent automatically; backend blacklists + clears it.
    await apiClient.post('/api/auth/logout/');
  } catch {
    // Silently ignore — blacklist is best-effort
  } finally {
    setAccessToken(null);
  }
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>('/api/auth/profile/');
  return data;
}

export async function updateProfile(payload: Partial<UserProfile>): Promise<UserProfile> {
  const { data } = await apiClient.patch<UserProfile>('/api/auth/profile/', payload);
  return data;
}
