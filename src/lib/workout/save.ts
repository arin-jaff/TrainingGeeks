import type { Modality } from "../db/types.js";
import { isCardio } from "../db/types.js";
import { computeS3 } from "../metrics/strength.js";

/** Planned metrics the planned_workout table stores. */
export interface PlannedInput {
  durationS: number | null;
  distanceM: number | null;
  tss: number | null;
}

/** Completed metrics (map onto the activity row). */
export interface CompletedInput {
  durationS: number | null;
  distanceM: number | null;
  avgSpeedMps: number | null;
  calories: number | null;
  elevationGainM: number | null;
  stress: number | null; // tss or rtss for cardio (s3 derived for strength)
  intensityFactor: number | null;
  workKj: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPower: number | null;
  maxPower: number | null;
  rpe: number | null;
}

export interface WorkoutInput {
  date: string; // YYYY-MM-DD (local)
  modality: Modality;
  name: string;
  description: string;
  privateNotes: string;
  plannedId?: number | null;
  activityId?: number | null;
  planned: PlannedInput | null;
  completed: CompletedInput | null;
  equipmentId?: number | null;
}

/** Field set written to planned_workout (omit nulls-only rows by caller check). */
export interface PlannedWrite {
  modality: Modality;
  date: string;
  name: string | null;
  description: string | null;
  planned_duration_s: number | null;
  planned_distance_m: number | null;
  planned_tss: number | null;
}

/** Field set written to the activity row (a subset of ActivityRow columns). */
export interface ActivityWrite {
  modality: Modality;
  start_time: string;
  local_date: string;
  source: "manual";
  name: string | null;
  notes: string | null;
  private_notes: string | null;
  duration_s: number | null;
  distance_m: number | null;
  avg_speed_mps: number | null;
  calories: number | null;
  elevation_gain_m: number | null;
  tss: number | null;
  s3: number | null;
  intensity_factor: number | null;
  kj: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  avg_power: number | null;
  max_power: number | null;
  rpe: number | null;
}

export interface WorkoutWrites {
  planned: PlannedWrite | null;
  activity: ActivityWrite | null;
}

const num = (v: number | null | undefined): number | null =>
  v != null && Number.isFinite(v) ? v : null;

function hasAny(o: Record<string, unknown> | null): boolean {
  if (!o) return false;
  return Object.values(o).some((v) => v != null && v !== "");
}

/**
 * Translate a quick-add/edit form submission into the rows to upsert. Pure: no
 * DB or framework access, so it can be unit-tested in isolation.
 */
export function buildWorkoutWrites(input: WorkoutInput): WorkoutWrites {
  const { modality, date, name, description, privateNotes } = input;
  const cardio = isCardio(modality);

  let planned: PlannedWrite | null = null;
  if (hasAny(input.planned as unknown as Record<string, unknown>)) {
    planned = {
      modality,
      date,
      name: name || null,
      description: description || null,
      planned_duration_s: num(input.planned!.durationS),
      planned_distance_m: num(input.planned!.distanceM),
      planned_tss: num(input.planned!.tss),
    };
  }

  let activity: ActivityWrite | null = null;
  if (hasAny(input.completed as unknown as Record<string, unknown>)) {
    const c = input.completed!;
    const durationS = num(c.durationS);
    const distanceM = num(c.distanceM);
    // Derive avg speed from distance/duration when the form didn't supply it.
    let avgSpeed = num(c.avgSpeedMps);
    if (avgSpeed == null && durationS && distanceM && durationS > 0)
      avgSpeed = distanceM / durationS;

    // Strength load (S³) is derived from duration + RPE; cardio uses entered TSS.
    const rpe = num(c.rpe);
    const s3 =
      !cardio && durationS != null
        ? computeS3(durationS, rpe ?? undefined)
        : null;
    const tss = cardio ? num(c.stress) : null;

    activity = {
      modality,
      start_time: `${date}T12:00:00.000Z`,
      local_date: date,
      source: "manual",
      name: name || null,
      notes: description || null,
      private_notes: privateNotes || null,
      duration_s: durationS,
      distance_m: distanceM,
      avg_speed_mps: avgSpeed,
      calories: num(c.calories),
      elevation_gain_m: num(c.elevationGainM),
      tss,
      s3,
      intensity_factor: num(c.intensityFactor),
      kj: num(c.workKj),
      avg_hr: num(c.avgHr),
      max_hr: num(c.maxHr),
      avg_power: cardio ? num(c.avgPower) : null,
      max_power: cardio ? num(c.maxPower) : null,
      rpe: rpe == null ? null : Math.round(rpe),
    };
  }

  return { planned, activity };
}
