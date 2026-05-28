import { apiClient } from './client';
import type { TrainingPlan, GeneratePlanRequest, PlanWorkout } from '../types/api';

export async function getActivePlan(): Promise<TrainingPlan | null> {
  try {
    const { data } = await apiClient.get<TrainingPlan>('/api/plans/active/');
    return data;
  } catch (err: unknown) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw err;
  }
}

export async function getPlan(id: string): Promise<TrainingPlan> {
  const { data } = await apiClient.get<TrainingPlan>(`/api/plans/${id}/`);
  return data;
}

export async function generatePlan(payload: GeneratePlanRequest): Promise<TrainingPlan> {
  const { data } = await apiClient.post<TrainingPlan>('/api/plans/generate/', payload);
  return data;
}

export async function markWorkoutComplete(
  planId: string,
  wid: string,
  activityId?: string | null,
): Promise<void> {
  await apiClient.patch(`/api/plans/${planId}/workouts/${wid}/complete/`, {
    activity_id: activityId ?? null,
  });
}

export async function swapWorkoutType(
  planId: string,
  wid: string,
  workoutType: string,
): Promise<PlanWorkout> {
  const { data } = await apiClient.patch<PlanWorkout>(
    `/api/plans/${planId}/workouts/${wid}/`,
    { workout_type: workoutType },
  );
  return data;
}

export async function exportPlanPDF(id: string): Promise<void> {
  const { data } = await apiClient.get(`/api/plans/${id}/export/pdf/`, { responseType: 'blob' });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `training_plan_${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPlanCSV(id: string): Promise<void> {
  const { data } = await apiClient.get(`/api/plans/${id}/export/csv/`, { responseType: 'blob' });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `training_plan_${id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
