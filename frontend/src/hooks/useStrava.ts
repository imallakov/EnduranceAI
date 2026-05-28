import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { StravaStatus } from '../types/api';
import { getStravaStatus, syncStrava, disconnectStrava } from '../api/integrations';

export function useStravaStatus() {
  return useQuery<StravaStatus>({
    queryKey: ['strava', 'status'],
    queryFn: getStravaStatus,
    // Status rarely changes — only when user manually connects/disconnects
    // or runs a sync. No need to refetch on every tab focus.
    staleTime: 1000 * 60 * 5,      // 5 min — long enough to feel "static"
    refetchOnWindowFocus: false,    // don't reload on tab switch
    refetchOnMount: false,          // use cached value if available
  });
}

export function useStravaSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncStrava,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strava', 'status'] });
    },
  });
}

export function useStravaDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: disconnectStrava,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['strava', 'status'] });
      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
