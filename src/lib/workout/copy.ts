import type { ActivityRow, PlannedWorkoutRow } from "../db/types.js";
import type { NewPlanned } from "../db/repo.js";

/**
 * The planned_workout row a calendar item becomes when pasted onto `date`.
 * Copying a completed activity yields its planned side only (name, notes,
 * duration/distance/load) — the actual numbers stay with the original day, so
 * the copy can be completed with what was really done on the new day.
 */
export function plannedCopyOf(
  item: { kind: "planned"; row: PlannedWorkoutRow } | { kind: "activity"; row: ActivityRow },
  date: string,
): NewPlanned {
  if (item.kind === "planned") {
    const p = item.row;
    return {
      modality: p.modality,
      date,
      name: p.name,
      description: p.description,
      planned_duration_s: p.planned_duration_s,
      planned_distance_m: p.planned_distance_m,
      planned_tss: p.planned_tss,
      structure: p.structure,
      template_id: p.template_id,
      source: "manual",
    };
  }
  const a = item.row;
  const strength = a.modality === "lift" || a.modality === "core";
  return {
    modality: a.modality,
    date,
    name: a.name,
    description: a.notes,
    planned_duration_s: a.duration_s,
    planned_distance_m: strength ? null : a.distance_m,
    planned_tss: strength ? a.s3 : a.tss,
    source: "manual",
  };
}
