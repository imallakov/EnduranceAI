import { apiClient } from './client';
import type {
  Activity, ActivityDetail,
  UploadResponse, UploadDuplicateResponse, UploadStatusResponse,
  ManualActivityPayload, Paginated,
} from '../types/api';

export interface ActivitiesFilters {
  date_from?: string;
  date_to?: string;
  min_km?: number;
  page?: number;
}

export async function uploadFile(file: File): Promise<UploadResponse | UploadDuplicateResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<UploadResponse | UploadDuplicateResponse>(
    '/api/activities/upload/',
    form,
  );
  return data;
}

export async function uploadZip(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<UploadResponse>('/api/activities/upload-zip/', form);
  return data;
}

export async function getUploadStatus(taskId: string): Promise<UploadStatusResponse> {
  const { data } = await apiClient.get<UploadStatusResponse>(
    `/api/activities/upload-status/${taskId}/`,
  );
  return data;
}

export async function createManual(payload: ManualActivityPayload): Promise<ActivityDetail> {
  const { data } = await apiClient.post<ActivityDetail>('/api/activities/manual/', payload);
  return data;
}

export async function getActivities(filters: ActivitiesFilters = {}): Promise<Paginated<Activity>> {
  const { data } = await apiClient.get<Paginated<Activity>>('/api/activities/', { params: filters });
  return data;
}

export async function getActivity(id: string): Promise<ActivityDetail> {
  const { data } = await apiClient.get<ActivityDetail>(`/api/activities/${id}/`);
  return data;
}

export async function deleteActivity(id: string): Promise<void> {
  await apiClient.delete(`/api/activities/${id}/`);
}
