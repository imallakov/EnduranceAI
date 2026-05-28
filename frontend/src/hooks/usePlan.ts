import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getActivePlan, generatePlan, markWorkoutComplete, swapWorkoutType,
} from '../api/plans';
import type { GeneratePlanRequest } from '../types/api';

export function useActivePlan() {
  return useQuery({
    queryKey: ['plan', 'active'],
    queryFn: getActivePlan,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useGeneratePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeneratePlanRequest) => generatePlan(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['plan', 'active'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useMarkWorkoutComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, wid, activityId }: { planId: string; wid: string; activityId?: string | null }) =>
      markWorkoutComplete(planId, wid, activityId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['plan', 'active'] });
    },
  });
}

export function useSwapWorkoutType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, wid, workoutType }: { planId: string; wid: string; workoutType: string }) =>
      swapWorkoutType(planId, wid, workoutType),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['plan', 'active'] });
    },
  });
}
