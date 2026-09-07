import { isCardio, type ActivityRow, type PlannedWorkoutRow } from "../db/types.js";
import type { NewPlanned } from "../db/repo.js";

/**
 * The planned_workout row a calendar item becomes when pasted onto `date`.
 * Copying a completed activity yields its planned side only (name, notes,
 * duration/distance/load) — the actual numbers stay with the original day, so
 * the copy can be completed with what was really done on the new day.
 */
export function plannedCopyOf(row: ActivityRow | PlannedWorkoutRow, date: string): NewPlanned {
  if ("planned_tss" in row) {
    return {
      modality: row.modality,
      date,
      name: row.name,
      description: row.description,
      planned_duration_s: row.planned_duration_s,
      planned_distance_m: row.planned_distance_m,
      planned_tss: row.planned_tss,
      structure: row.structure,
      template_id: row.template_id,
      source: "manual",
    };
  }
  const strength = !isCardio(row.modality);
  return {
    modality: row.modality,
    date,
    name: row.name,
    description: row.notes,
    planned_duration_s: row.duration_s,
    planned_distance_m: strength ? null : row.distance_m,
    planned_tss: strength ? row.s3 : row.tss,
    source: "manual",
  };
}
