import { addDays, startOfWeekMonday } from "../util/dates.js";
import { PLANS } from "./catalog.js";
import { planSource, type TrainingPlan } from "./types.js";

export function getPlan(id: string): TrainingPlan | undefined {
  return PLANS.find((p) => p.id === id);
}

export interface PlannedFromPlan {
  modality: NonNullable<TrainingPlan["workouts"][number]["modality"]>;
  date: string;
  name: string;
  description: string;
  planned_duration_s: number | null;
  planned_distance_m: number | null;
  source: string;
}

/**
 * Expand a plan into dated planned workouts starting on `startDate`
 * (which should be a Monday — day 1 of week 1). Rest days are skipped.
 */
export function planToPlanned(
  plan: TrainingPlan,
  startDate: string,
): PlannedFromPlan[] {
  const src = planSource(plan.id);
  const out: PlannedFromPlan[] = [];
  for (const w of plan.workouts) {
    if (!w.modality) continue; // rest day
    out.push({
      modality: w.modality,
      date: addDays(startDate, w.dayNum - 1),
      name: w.type,
      description: [w.description, w.notes].filter(Boolean).join(" — "),
      planned_duration_s: w.durationS,
      planned_distance_m: w.distanceM,
      source: src,
    });
  }
  return out;
}

/** Default start: the Monday on or after `today`. */
export function defaultStartDate(today: string): string {
  const monday = startOfWeekMonday(today);
  return monday >= today ? monday : addDays(monday, 7);
}

/** Race/end date = the last day covered by the plan from `startDate`. */
export function planEndDate(plan: TrainingPlan, startDate: string): string {
  return addDays(startDate, plan.weeks * 7 - 1);
}
