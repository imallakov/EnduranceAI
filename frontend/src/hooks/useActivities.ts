import { useQuery } from '@tanstack/react-query';
import { getActivities } from '../api/activities';
import type { ActivitiesFilters } from '../api/activities';

export function useActivities(filters: ActivitiesFilters = {}) {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: () => getActivities(filters),
    staleTime: 1000 * 30,
  });
}
