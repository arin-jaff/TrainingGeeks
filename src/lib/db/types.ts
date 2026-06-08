/**
 * Shared domain types and the modality model.
 *
 * Five logged modalities; four fitness curves (Core folds into Strength).
 */

export type Modality = "run" | "bike" | "swim" | "row" | "lift" | "core";
export type FitnessCurve = "run" | "bike" | "swim" | "row" | "strength";

export const MODALITIES: readonly Modality[] = ["run", "bike", "swim", "row", "lift", "core"];
export const FITNESS_CURVES: readonly FitnessCurve[] = ["run", "bike", "swim", "row", "strength"];

export const CARDIO_MODALITIES: readonly Modality[] = ["run", "bike", "swim", "row"];
export const STRENGTH_MODALITIES: readonly Modality[] = ["lift", "core"];

/** Map a logged modality to the fitness curve it contributes to. */
export function modalityToCurve(m: Modality): FitnessCurve {
  return m === "lift" || m === "core" ? "strength" : m;
}

export function isCardio(m: Modality): boolean {
  return m === "run" || m === "bike" || m === "swim" || m === "row";
}

export type Units = "imperial" | "metric";
export type ThresholdMetric =
  | "ftp" // cycling functional threshold power (W)
  | "threshold_pace" // run/swim threshold pace (seconds per unit distance)
  | "threshold_hr" // bpm
  | "max_hr" // bpm
  | "resting_hr"; // bpm
export type ZoneMetric = "power" | "pace" | "hr";
export type ActivitySource = "manual" | "intervals";

// ---- Row types ---------------------------------------------------------

export interface AthleteRow {
  id: number;
  name: string;
  email: string | null;
  units: Units;
  timezone: string;
  dob: string | null;
  avatar_path: string | null;
  strength_rpe_default: number;
  created_at: string;
  updated_at: string;
}

export interface ThresholdRow {
  id: number;
  curve: FitnessCurve;
  metric: ThresholdMetric;
  value: number;
  valid_from: string; // YYYY-MM-DD
  created_at: string;
}

export interface ZoneRow {
  id: number;
  curve: FitnessCurve;
  metric: ZoneMetric;
  zone_index: number;
  name: string;
  low: number;
  high: number;
  valid_from: string;
}

export interface ActivityRow {
  id: number;
  modality: Modality;
  sport_detail: string | null;
  source: ActivitySource;
  fit_hash: string | null;
  raw_path: string | null;
  start_time: string; // ISO UTC
  local_date: string; // YYYY-MM-DD in athlete tz
  timezone: string | null;
  name: string | null;
  notes: string | null;
  duration_s: number | null;
  elapsed_s: number | null;
  distance_m: number | null;
  elevation_gain_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  avg_power: number | null;
  max_power: number | null;
  np: number | null;
  avg_speed_mps: number | null;
  max_speed_mps: number | null;
  avg_cadence: number | null;
  max_cadence: number | null;
  calories: number | null;
  kj: number | null;
  tss: number | null;
  s3: number | null;
  intensity_factor: number | null;
  variability_index: number | null;
  efficiency_factor: number | null;
  decoupling: number | null;
  rpe: number | null;
  route_polyline: string | null;
  metrics_version: number;
  created_at: string;
  updated_at: string;
}

export interface DailyLoadRow {
  id: number;
  date: string; // YYYY-MM-DD
  curve: FitnessCurve | "all";
  stress: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface PlannedWorkoutRow {
  id: number;
  modality: Modality;
  date: string;
  name: string | null;
  description: string | null;
  planned_duration_s: number | null;
  planned_distance_m: number | null;
  planned_tss: number | null;
  completed_activity_id: number | null;
  source: ActivitySource;
  created_at: string;
  updated_at: string;
}

export interface ConnectorAccountRow {
  id: number;
  provider: string;
  api_key: string | null;
  athlete_id: string | null;
  last_sync_cursor: string | null;
  enabled: number;
  updated_at: string;
}

export interface EventRow {
  id: number;
  name: string;
  date: string;
  notes: string | null;
}

export interface GoalRow {
  id: number;
  text: string;
  done: number;
  created_at: string;
}
