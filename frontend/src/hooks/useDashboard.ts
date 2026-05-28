import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api/dashboard';
import type { DashboardResponse } from '../types/api';

export function useDashboard() {
  return useQuery<DashboardResponse>({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    staleTime: 1000 * 30,  // 30s
    retry: 1,
  });
}
