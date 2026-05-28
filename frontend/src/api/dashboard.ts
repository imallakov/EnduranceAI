import { apiClient } from './client';
import type { DashboardResponse } from '../types/api';

export async function getDashboard(): Promise<DashboardResponse> {
  const { data } = await apiClient.get<DashboardResponse>('/api/dashboard/');
  return data;
}
