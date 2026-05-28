export type ShareTemplate = 'minimalist' | 'cinematic' | 'splits';
export type ShareFormat = '9:16' | '1:1' | '4:5';

export interface ShareToggles {
  map: boolean;
  hr: boolean;
  pace: boolean;
  /** Show activity/prediction date on the card. Optional because some users
   *  share old runs and don't want to highlight when they happened. */
  date: boolean;
}
// Note: watermark is no longer a toggle. Brand mark + domain are always
// rendered — the share image is the viral surface, removing the wordmark
// would defeat the purpose of the feature. Strava and Garmin enforce the
// same constraint.

export interface ShareData {
  // activity fields
  distance_km?: number;
  duration_sec?: number;
  avg_pace_sec_per_km?: number | null;
  avg_hr?: number | null;
  max_hr?: number | null;
  elevation_gain_m?: number | null;
  vdot_estimate?: number | null;
  tss?: number | null;
  laps?: Array<{
    lap: number;
    distance_km: number;
    duration_sec: number;
    avg_pace_sec_per_km: number | null;
    avg_hr?: number | null;
  }>;
  polyline?: string;
  start_time?: string;
  // prediction fields
  predicted_time_sec?: number;
  predicted_time_formatted?: string;
  marathon_name?: string | null;
  /** Race date as ISO string. Used to compute "X days to race" badge — the
   *  single most viral element of a prediction share (creates anticipation,
   *  drives followers to ask about the race). */
  race_date?: string | null;
  /** ±N seconds confidence band from the ensemble model. Showing this is the
   *  honest move and a credibility signal: most race-time predictors hide
   *  their uncertainty. */
  confidence_interval_sec?: number | null;
  /** Model version tag, e.g. "v0.3-hybrid". Useful for tagging shares from
   *  the same model generation. */
  model_version?: string | null;
  recommended_pace?: {
    start_10km: string;
    middle_22km: string;
    finish_10km: string;
  };
}

export type ShareMode = 'activity' | 'prediction';
