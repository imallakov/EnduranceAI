import { apiClient } from './client';
import type { Marathon, MarathonPreviewResponse, MarathonResult, MarathonWeatherResponse, Paginated } from '../types/api';

export async function getMarathons(): Promise<Marathon[]> {
  const { data } = await apiClient.get<Paginated<Marathon>>('/api/marathons/', {
    params: { page_size: 100 },
  });
  return data.results;
}

export async function getMarathon(id: string): Promise<Marathon> {
  const { data } = await apiClient.get<Marathon>(`/api/marathons/${id}/`);
  return data;
}

export async function previewGPX(file: File): Promise<MarathonPreviewResponse> {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await apiClient.post<MarathonPreviewResponse>('/api/marathons/preview/', fd);
  return data;
}

export async function createCustomMarathon(
  fields: { name: string; city: string; country: string; race_date?: string },
  file: File,
): Promise<Marathon> {
  const fd = new FormData();
  fd.append('gpx_file', file);
  fd.append('name', fields.name);
  fd.append('city', fields.city);
  fd.append('country', fields.country);
  if (fields.race_date) fd.append('race_date', fields.race_date);
  const { data } = await apiClient.post<Marathon>('/api/marathons/custom/', fd);
  return data;
}

export async function getMarathonResults(
  id: string,
  params?: { year?: number; age_group?: string; sex?: string },
): Promise<Paginated<MarathonResult>> {
  const { data } = await apiClient.get<Paginated<MarathonResult>>(
    `/api/marathons/${id}/results/`,
    { params },
  );
  return data;
}

export async function getMarathonWeather(id: string): Promise<MarathonWeatherResponse> {
  const { data } = await apiClient.get<MarathonWeatherResponse>(`/api/marathons/${id}/weather/`);
  return data;
}

export async function setTargetMarathon(marathonId: string, raceDate?: string | null): Promise<void> {
  await apiClient.patch('/api/auth/profile/', {
    target_marathon: marathonId,
    target_race_date: raceDate ?? null,
  });
}
