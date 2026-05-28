// Types derived from backend serializers — do not use `any`

// ── User ─────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  sex: string | null;
  max_hr: number | null;
  target_marathon: string | null;
  target_marathon_name: string | null;
  target_race_date: string | null;
  target_finish_sec: number | null;
  units: string;
  lang: string;
  current_vdot: number | null;
  current_ctl: number | null;
  current_atl: number | null;
  current_tsb: number | null;
  training_weeks: number;
  age: number | null;
  created_at: string;
  onboarding_completed: boolean;
}

// ── Auth ──────────────────────────────────────────────────────────────
export interface AuthResponse {
  access: string;
  refresh: string;
  user: UserProfile;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  marketing_emails_consent?: boolean;
}

// ── Activity (ActivityListSerializer) ────────────────────────────────
export interface Activity {
  id: string;
  start_time: string;                   // ISO datetime
  distance_km: number;
  duration_sec: number;
  avg_pace_sec_per_km: number | null;
  avg_hr: number | null;
  vdot_estimate: number | null;
  tss: number | null;
  elevation_gain_m: number | null;
  source: 'fit' | 'gpx' | 'tcx' | 'manual' | 'strava';
  is_valid: boolean;
}

// ── Marathon ──────────────────────────────────────────────────────────
export interface Marathon {
  id: string;
  name: string;
  city: string;
  country: string;           // ISO 3166-1 alpha-2, e.g. "DE"
  distance_km: string | number;   // DecimalField → string from DRF
  elevation_gain_m: string | number | null;
  elevation_loss_m: string | number | null;
  difficulty_coefficient: string | number;
  gpx_file_path: string;
  polyline: string;
  start_lat: string | number | null;
  start_lon: string | number | null;
  avg_temp_by_month: Record<string, number>;
  // Real per-km elevation extracted from GPX (km marker + average elevation in metres).
  // Empty array when the source GPX has no elevation data (e.g. some Strava exports).
  elevation_profile?: Array<{ km: number; elevation_m: number }>;
  official_url: string;
  last_updated: string | null;
  major: boolean;
  is_custom: boolean;
  created_by: string | null;
  // Computed by MarathonSerializer — present on detail endpoint
  results_count?: number;
  has_historical_data?: boolean;
}

export interface MarathonResult {
  id: string;
  marathon: string;
  year: number;
  age_group: string;
  sex: string;
  finish_time_sec: number;
  finish_time_formatted: string;
  position_overall: number | null;
  position_age_group: number | null;
  country: string;
}

export interface MarathonWeatherResponse {
  avg_temp_by_month: Record<string, number>;
}

export interface MarathonPreviewResponse {
  distance_km: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  elevation_profile: Array<{ km: number; elevation_m: number }>;
  difficulty_coefficient: number;
  polyline: string;
  start_lat: number | null;
  start_lon: number | null;
}

// ── Prediction (PredictionSerializer, exclude=['user']) ───────────────
export interface FeatureImportanceItem {
  feature: string;
  impact_sec: number;
  description: string;
}

export interface RecommendedPace {
  start_10km: string;
  middle_22km: string;
  finish_10km: string;
}

export interface PredictionRequest {
  marathon_id?: string | null;
  distance_km?: number;
  race_date?: string | null;
  temp_c?: number | null;
  humidity_pct?: number;
  wind_ms?: number;
}

export interface Prediction {
  id: string;
  marathon: string | null;
  marathon_name: string | null;
  marathon_polyline?: string;  // encoded polyline of the marathon route (for share art)
  created_at: string;
  target_distance_km: number | null;
  race_date: string | null;
  base_time_sec: number | null;
  course_difficulty_coefficient: number | null;
  weather_index: number | null;
  predicted_time_sec: number;
  confidence_interval_sec: number | null;
  race_readiness_score: number | null;
  features_snapshot: Record<string, unknown>;
  feature_importance: FeatureImportanceItem[];
  model_version: string;
  predicted_time_formatted: string;   // e.g. "3:44:12"
}

// POST /api/predictions/ returns Prediction + extras not stored in DB
export interface PredictionResponse extends Prediction {
  recommended_pace: RecommendedPace;
  race_readiness: RaceReadiness | null;
}

// ── DailyMetric ───────────────────────────────────────────────────────
export interface DailyMetric {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

// ── Lap (stored in Activity.laps JSONField) ───────────────────────────
// Parser-populated. Older activities may lack the elevation/HR fields
// since they were imported before the parser was extended.
export interface Lap {
  lap: number;
  distance_km: number;
  duration_sec: number;
  avg_pace_sec_per_km: number | null;
  avg_hr?: number | null;
  elevation_gain_m?: number | null;
  elevation_loss_m?: number | null;
  avg_elevation_m?: number | null;
}

// ── ActivityDetail (ActivityDetailSerializer — excludes user, raw_file_path, file_hash) ──
export interface ActivityDetail {
  id: string;
  start_time: string;
  distance_km: number;
  duration_sec: number;
  avg_pace_sec_per_km: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  elevation_gain_m: number | null;
  elevation_loss_m: number | null;
  avg_cadence: number | null;
  calories: number | null;
  vdot_estimate: number | null;
  tss: number | null;
  laps: Lap[];
  hr_zones_sec: Record<string, number>;
  polyline: string;
  source: 'fit' | 'gpx' | 'tcx' | 'manual' | 'strava';
  is_valid: boolean;
  created_at: string;
}

// ── Upload ────────────────────────────────────────────────────────────
export interface UploadResponse {
  task_id: string;
}

export interface UploadDuplicateResponse {
  warning: string;
  duplicate: true;
}

export type UploadStatus = 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE';

export interface SingleFileResult {
  status: string;
  activity_id: string | null;
  distance_km: number | null;
  is_valid: boolean;
  errors: string[];
}

export interface ZipFileEntry {
  file: string;
  task_id?: string;
  status?: 'duplicate';
}

export interface ZipResult {
  status: string;
  files: ZipFileEntry[];
}

export interface UploadStatusResponse {
  status: UploadStatus;
  result?: SingleFileResult | ZipResult;
}

export interface ManualActivityPayload {
  date: string;
  distance_km: number;
  duration_sec: number;
  avg_hr?: number | null;
  elevation_gain_m?: number | null;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Dashboard ─────────────────────────────────────────────────────────
export interface DashboardMetrics {
  vdot: number | null;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
}

export interface ReadinessComponents {
  tsb_score: number;
  consistency: number;
  long_runs: number;
  vdot_trend: number;
  volume: number;
}

export interface RaceReadiness {
  score: number;
  components: ReadinessComponents;
}

// ── Training Plan ─────────────────────────────────────────────────────
export type WorkoutType =
  | 'rest' | 'easy' | 'long' | 'tempo'
  | 'interval' | 'repetition' | 'marathon_pace';

export type PlanPhase = 'base' | 'early_quality' | 'late_quality' | 'taper';

export interface PlanWorkout {
  id: string;
  day_of_week: number;           // 0=Mon, 6=Sun
  workout_type: WorkoutType;
  distance_km: string | null;    // DecimalField → string from DRF
  pace_min_sec: number | null;
  pace_max_sec: number | null;
  pace_min_formatted: string | null;
  pace_max_formatted: string | null;
  structure: Record<string, unknown>;
  completed: boolean;
  activity: string | null;
  hr_min: number | null;
  hr_max: number | null;
}

export interface PlanWeek {
  id: string;
  week_number: number;
  phase: PlanPhase;
  total_km: string;              // DecimalField → string from DRF
  notes: string;
  workouts: PlanWorkout[];
}

export interface PaceZone {
  key: string;
  name: string;
  pace: string;
  sub: string;
  color: string;
}

export interface TrainingPlan {
  id: string;
  start_date: string;
  race_date: string;
  target_time_sec: number | null;
  vdot_at_creation: string | null; // DecimalField → string from DRF
  vdot_at_last_refresh: string | null;
  last_paces_refresh_at: string | null;
  days_per_week: number;
  status: 'active' | 'archived' | 'completed';
  prediction: string | null;
  created_at: string;
  weeks: PlanWeek[];
  // computed
  days_to_race: number;
  current_week_number: number;
  total_weeks: number;
  plan_total_km: number;
  total_distance_km_completed: number;
  total_workouts: number;
  completed_workouts: number;
  pace_zones: PaceZone[];
  /** L1 plan adaptation: present when paces were auto-refreshed for an
   *  improved/declined VDOT within the last 7 days. Null otherwise. */
  paces_refreshed: {
    old_vdot: number;
    new_vdot: number;
    delta: number;       // signed, e.g. +3.5 means VDOT grew by 3.5 pts
    refreshed_at: string;
  } | null;
}

export interface GeneratePlanRequest {
  race_date: string;
  days_per_week: number;
  target_time_sec?: number | null;
  cutback_enabled?: boolean;
}

// ── Strava Integration ────────────────────────────────────────────────
export interface StravaStatus {
  connected: boolean;
  is_broken: boolean;
  athlete_username: string | null;
  last_sync_at: string | null;
  total_imported: number;
  expires_at: string | null;
}

export interface StravaConnectResponse {
  authorize_url: string;
}

// ── Legal ─────────────────────────────────────────────────────────────
export type PolicyType = 'privacy' | 'terms' | 'cookies';

export interface PolicyVersion {
  id: string;
  policy_type: PolicyType;
  version: string;
  effective_date: string;
  content_en: string;
  content_ru: string;
  is_active: boolean;
  created_at: string;
}

export interface PolicyAcceptanceRecord {
  id: string;
  policy_id: string;
  policy_type: PolicyType;
  policy_version: string;
  accepted_at: string;
  ip_address: string | null;
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
  race_readiness: RaceReadiness | null;
  latest_prediction: Prediction | null;
  prediction_for_target: boolean;
  days_to_race: number | null;
  recent_activities: Activity[];
  weekly_km_current: number;
  weekly_km_avg_8w: number;
  ctl_atl_tsb_chart: DailyMetric[];
}
