import type { Modality } from "../db/types.js";

/** One prescribed workout within a training plan (a single day). */
export interface PlanWorkout {
  week: number; // 1-based
  dayOfWeek: string; // "Monday" .. "Sunday"
  dayNum: number; // 1-based day offset from plan start
  type: string; // e.g. "Easy Run", "Long Run", "Rest"
  /** null for rest days. */
  modality: Modality | null;
  durationS: number | null;
  distanceM: number | null;
  intensity: string; // "Easy", "Tempo", ...
  description: string;
  notes: string;
}

/** A complete, schedulable training plan. */
export interface TrainingPlan {
  id: string; // e.g. "MAR_NOV1_01"
  name: string; // e.g. "Hal Higdon Marathon Novice 1"
  source: string; // e.g. "Hal Higdon"
  distance: string; // e.g. "Marathon"
  level: string; // e.g. "Novice"
  weeks: number;
  workouts: PlanWorkout[];
}

/** Stable source tag for planned workouts created from a plan. */
export function planSource(planId: string): string {
  return `plan:${planId}`;
}
