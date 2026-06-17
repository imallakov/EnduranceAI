import { useQuery } from '@tanstack/react-query';
import {
  getCurrentMetrics, getVdotHistory, getGoalProgress,
  getWeeklyVolume, getConsistency, getHrEfficiency, getZonesDist, getRecords,
  getBestEfforts, getBlockCompare, getPredictionAccuracy,
} from '../api/metrics';

const opts = {
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

export function useCurrentMetrics() {
  return useQuery({ queryKey: ['metrics', 'current'], queryFn: getCurrentMetrics, ...opts });
}

export function useVdotHistory() {
  return useQuery({ queryKey: ['metrics', 'vdot-history'], queryFn: getVdotHistory, ...opts });
}

export function useGoalProgress() {
  return useQuery({ queryKey: ['metrics', 'goal-progress'], queryFn: getGoalProgress, ...opts });
}

export function useWeeklyVolume(weeks = 12) {
  return useQuery({
    queryKey: ['metrics', 'weekly-volume', weeks],
    queryFn: () => getWeeklyVolume(weeks),
    ...opts,
  });
}

export function useConsistency() {
  return useQuery({ queryKey: ['metrics', 'consistency'], queryFn: getConsistency, ...opts });
}

export function useHrEfficiency() {
  return useQuery({ queryKey: ['metrics', 'hr-efficiency'], queryFn: getHrEfficiency, ...opts });
}

export function useZonesDist(weeks = 8) {
  return useQuery({
    queryKey: ['metrics', 'zones-dist', weeks],
    queryFn: () => getZonesDist(weeks),
    ...opts,
  });
}

export function useRecords() {
  return useQuery({ queryKey: ['metrics', 'records'], queryFn: getRecords, ...opts });
}

export function useBestEfforts() {
  return useQuery({ queryKey: ['metrics', 'best-efforts'], queryFn: getBestEfforts, ...opts });
}

export function useBlockCompare(weeks = 4) {
  return useQuery({
    queryKey: ['metrics', 'block-compare', weeks],
    queryFn: () => getBlockCompare(weeks),
    ...opts,
  });
}

export function usePredictionAccuracy() {
  return useQuery({ queryKey: ['metrics', 'prediction-accuracy'], queryFn: getPredictionAccuracy, ...opts });
}
