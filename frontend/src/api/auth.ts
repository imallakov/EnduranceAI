import { apiClient } from './client';
import type { AuthResponse, UserProfile, LoginPayload, RegisterPayload } from '../types/api';

export async function login(payload: LoginPayload): Promise<UserProfile> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/login/', payload);
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  return data.user;
}

export async function register(payload: RegisterPayload): Promise<UserProfile> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/register/', payload);
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  return data.user;
}

export async function logout(): Promise<void> {
  const refresh = localStorage.getItem('refresh_token');
  try {
    if (refresh) {
      await apiClient.post('/api/auth/logout/', { refresh });
    }
  } catch {
    // Silently ignore — blacklist is best-effort
  } finally {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
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
