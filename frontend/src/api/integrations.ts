import { apiClient } from './client';
import type { StravaStatus, StravaConnectResponse } from '../types/api';

export async function getStravaStatus(): Promise<StravaStatus> {
  const { data } = await apiClient.get<StravaStatus>('/api/integrations/strava/status/');
  return data;
}

export async function startStravaConnect(redirectPath = '/settings'): Promise<void> {
  const { data } = await apiClient.post<StravaConnectResponse>('/api/integrations/strava/connect/', {
    redirect_path: redirectPath,
  });
  window.location.assign(data.authorize_url);
}

export async function syncStrava(): Promise<{ task_id: string }> {
  const { data } = await apiClient.post<{ task_id: string }>('/api/integrations/strava/sync/');
  return data;
}

export async function disconnectStrava(): Promise<void> {
  await apiClient.post('/api/integrations/strava/disconnect/');
}
