import { useQuery, useMutation } from '@tanstack/react-query';
import { getActivePolicy, acceptPolicy, getUserAcceptances } from '../api/legal';
import type { PolicyType } from '../types/api';

export function useActivePolicy(type: PolicyType) {
  return useQuery({
    queryKey: ['legal', 'policy', type],
    queryFn: () => getActivePolicy(type),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useAcceptPolicy() {
  return useMutation({
    mutationFn: acceptPolicy,
  });
}

export function useUserAcceptances() {
  return useQuery({
    queryKey: ['legal', 'acceptances'],
    queryFn: getUserAcceptances,
    staleTime: 5 * 60 * 1000,
  });
}
