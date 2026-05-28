import { useQuery } from '@tanstack/react-query';
import { getActivity } from '../api/activities';

export function useActivityDetail(id: string) {
  return useQuery({
    queryKey: ['activity', id],
    queryFn: () => getActivity(id),
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
  });
}
