import { apiClient } from './client';
import type { PolicyVersion, PolicyAcceptanceRecord } from '../types/api';

export async function getActivePolicy(type: string): Promise<PolicyVersion> {
  const { data } = await apiClient.get<PolicyVersion>(`/api/legal/policies/${type}/active/`);
  return data;
}

export async function acceptPolicy(policyId: string): Promise<PolicyAcceptanceRecord> {
  const { data } = await apiClient.post<PolicyAcceptanceRecord>('/api/legal/accept/', {
    policy_id: policyId,
    accepted: true,
  });
  return data;
}

export async function getUserAcceptances(): Promise<PolicyAcceptanceRecord[]> {
  const { data } = await apiClient.get<PolicyAcceptanceRecord[]>('/api/legal/user-acceptances/');
  return data;
}
