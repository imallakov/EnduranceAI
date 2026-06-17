import { apiClient } from './client';

export interface CurrentMetrics {
  vdot: number | null;
  ctl: number | null;       // chronic load ≈ "fitness" in load terms
  atl: number | null;       // acute load ≈ "fatigue"
  tsb: number | null;       // training stress balance ≈ "freshness"
  hr_efficiency: number | null;
  training_weeks: number | null;
  training_paces: Record<string, string>;
}

export interface VdotPoint { week: string; vdot: number }

export interface GoalProgress {
  available: boolean;
  target_sec?: number;
  course_coeff?: number;
  status?: 'ahead' | 'on_track' | 'slightly_behind' | 'behind' | null;
  series?: { week: string; projected_sec: number }[];
}

export interface WeeklyVolumePoint { week: string; km: number; runs: number }

export interface Consistency {
  current_week_streak: number;
  runs_per_week: number;
  adherence_pct: number | null;
}

export interface HrEffPoint { week: string; efficiency: number }

export type ZonesDist = Record<string, number>;   // { E, M, T, I, R } → percent

export interface Records {
  total_distance_km: number;
  total_runs: number;
  longest_run_km: number;
  fastest_pace_sec: number | null;
  fastest_pace_distance_km: number | null;
}

export type BestEffort = { time_sec: number; date: string; activity_id: string } | null;
export interface BestEfforts { '5k': BestEffort; '10k': BestEffort; half: BestEffort }

export interface BlockStats { km: number; runs: number; longest_km: number; avg_vdot: number | null }
export interface BlockCompare { weeks: number; current: BlockStats; previous: BlockStats }

export interface PredictionAccuracyRow {
  race_date: string;
  marathon_name: string | null;
  predicted_sec: number | null;
  actual_sec: number;
  delta_sec: number | null;
  error_pct: number | null;
}

export async function getCurrentMetrics(): Promise<CurrentMetrics> {
  const { data } = await apiClient.get<CurrentMetrics>('/api/metrics/current/');
  return data;
}

export async function getVdotHistory(): Promise<VdotPoint[]> {
  const { data } = await apiClient.get<VdotPoint[]>('/api/metrics/vdot-history/');
  return data;
}

export async function getGoalProgress(): Promise<GoalProgress> {
  const { data } = await apiClient.get<GoalProgress>('/api/metrics/goal-progress/');
  return data;
}

export async function getWeeklyVolume(weeks = 12): Promise<WeeklyVolumePoint[]> {
  const { data } = await apiClient.get<WeeklyVolumePoint[]>(
    `/api/metrics/weekly-volume/?weeks=${weeks}`,
  );
  return data;
}

export async function getConsistency(): Promise<Consistency> {
  const { data } = await apiClient.get<Consistency>('/api/metrics/consistency/');
  return data;
}

export async function getHrEfficiency(): Promise<HrEffPoint[]> {
  const { data } = await apiClient.get<HrEffPoint[]>('/api/metrics/hr-efficiency/');
  return data;
}

export async function getZonesDist(weeks = 8): Promise<ZonesDist> {
  const { data } = await apiClient.get<ZonesDist>(`/api/metrics/zones-dist/?weeks=${weeks}`);
  return data;
}

export async function getRecords(): Promise<Records> {
  const { data } = await apiClient.get<Records>('/api/metrics/records/');
  return data;
}

export async function getBestEfforts(): Promise<BestEfforts> {
  const { data } = await apiClient.get<BestEfforts>('/api/metrics/best-efforts/');
  return data;
}

export async function getBlockCompare(weeks = 4): Promise<BlockCompare> {
  const { data } = await apiClient.get<BlockCompare>(`/api/metrics/block-compare/?weeks=${weeks}`);
  return data;
}

export async function getPredictionAccuracy(): Promise<PredictionAccuracyRow[]> {
  const { data } = await apiClient.get<PredictionAccuracyRow[]>('/api/metrics/prediction-accuracy/');
  return data;
}
