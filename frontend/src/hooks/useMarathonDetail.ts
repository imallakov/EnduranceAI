import { useQuery } from '@tanstack/react-query';
import { getMarathon, getMarathonResults, getMarathonWeather } from '../api/marathons';
import type { Marathon, MarathonResult, MarathonWeatherResponse, Paginated } from '../types/api';

export function useMarathon(id: string) {
  return useQuery<Marathon, Error>({
    queryKey: ['marathon', id],
    queryFn: () => getMarathon(id),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
}

interface ResultFilters {
  year?: number;
  age_group?: string;
  sex?: string;
}

export function useMarathonResults(
  id: string,
  filters: ResultFilters = {},
  hasHistoricalData?: boolean,
) {
  return useQuery<Paginated<MarathonResult>, Error>({
    queryKey: ['marathon-results', id, filters],
    queryFn: () => getMarathonResults(id, filters),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!(id && hasHistoricalData),
  });
}

export function useMarathonWeather(id: string) {
  return useQuery<MarathonWeatherResponse, Error>({
    queryKey: ['marathon-weather', id],
    queryFn: () => getMarathonWeather(id),
    staleTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
}
