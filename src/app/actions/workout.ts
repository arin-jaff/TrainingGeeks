"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import {
  addEquipmentDistance,
  deleteActivity,
  deletePlanned,
  getActivity,
  getPlanned,
  insertActivity,
  insertPlanned,
  setPlannedCompleted,
  updateActivityMetrics,
  updatePlanned,
} from "@/lib/db/repo";
import type { ActivityRow } from "@/lib/db/types";
import { recomputeFitness } from "@/lib/fitness/recompute";
import { buildWorkoutWrites, type WorkoutInput } from "@/lib/workout/save";
import type { WorkoutStep } from "@/lib/workout/template";

function refresh() {
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

/**
 * Create or update a workout's planned and/or completed sides. Planned values
 * live in planned_workout; completed values become a manual activity row (which
 * feeds fitness/dashboard). When both exist they are linked.
 */
export async function saveWorkout(
  input: WorkoutInput,
): Promise<{ ok: boolean; plannedId: number | null; activityId: number | null }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    return { ok: false, plannedId: null, activityId: null };

  const db = getDb();
  const { planned, activity } = buildWorkoutWrites(input);

  let plannedId = input.plannedId ?? null;
  let activityId = input.activityId ?? null;

  // ---- Planned side ----
  if (planned) {
    if (plannedId) {
      updatePlanned(db, plannedId, planned);
    } else {
      plannedId = insertPlanned(db, { ...planned, source: "manual" });
    }
  } else if (plannedId) {
    // Planned values cleared on an existing planned workout → drop it.
    deletePlanned(db, plannedId);
    plannedId = null;
  }

  // ---- Completed side ----
  let completedChanged = false;
  if (activity) {
    if (activityId) {
      // Keep the original date/source; update name/notes/metrics only.
      const { start_time: _st, local_date: _ld, source: _s, ...metrics } = activity;
      void _st;
      void _ld;
      void _s;
      updateActivityMetrics(db, activityId, metrics as Partial<ActivityRow>);
    } else {
      activityId = insertActivity(db, activity);
      if (input.equipmentId && activity.distance_m)
        addEquipmentDistance(db, input.equipmentId, activity.distance_m);
    }
    completedChanged = true;
  } else if (activityId) {
    deleteActivity(db, activityId);
    activityId = null;
    completedChanged = true;
  }

  // Link planned ↔ completed.
  if (plannedId) setPlannedCompleted(db, plannedId, activityId);

  if (completedChanged) recomputeFitness(db);
  refresh();
  return { ok: true, plannedId, activityId };
}

export async function deleteWorkout(args: {
  plannedId?: number | null;
  activityId?: number | null;
}): Promise<void> {
  const db = getDb();
  if (args.plannedId) deletePlanned(db, args.plannedId);
  if (args.activityId) {
    deleteActivity(db, args.activityId);
    recomputeFitness(db);
  }
  refresh();
}

export interface WorkoutEditData {
  date: string;
  modality: string;
  name: string;
  description: string;
  privateNotes: string;
  plannedId: number | null;
  activityId: number | null;
  planned: { durationS: number | null; distanceM: number | null; tss: number | null } | null;
  completed: {
    durationS: number | null;
    distanceM: number | null;
    avgSpeedMps: number | null;
    calories: number | null;
    elevationGainM: number | null;
    stress: number | null;
    intensityFactor: number | null;
    workKj: number | null;
    avgHr: number | null;
    maxHr: number | null;
    avgPower: number | null;
    maxPower: number | null;
    rpe: number | null;
  } | null;
  hasStreams: boolean; // synced activity with a route/streams → offer Analyze link
  /** Structured-workout steps when this planned item carries a built structure. */
  structure: WorkoutStep[] | null;
}

/** Load an existing calendar item into the modal's editable shape. */
export async function getWorkoutForEdit(
  kind: "activity" | "planned",
  id: number,
): Promise<WorkoutEditData | null> {
  const db = getDb();

  const activityToCompleted = (a: ActivityRow) => ({
    durationS: a.duration_s,
    distanceM: a.distance_m,
    avgSpeedMps: a.avg_speed_mps,
    calories: a.calories,
    elevationGainM: a.elevation_gain_m,
    stress: a.tss,
    intensityFactor: a.intensity_factor,
    workKj: a.kj,
    avgHr: a.avg_hr,
    maxHr: a.max_hr,
    avgPower: a.avg_power,
    maxPower: a.max_power,
    rpe: a.rpe,
  });

  if (kind === "planned") {
    const p = getPlanned(db, id);
    if (!p) return null;
    const act = p.completed_activity_id ? getActivity(db, p.completed_activity_id) : undefined;
    let structure: WorkoutStep[] | null = null;
    if (p.structure) {
      try {
        structure = JSON.parse(p.structure) as WorkoutStep[];
      } catch {
        structure = null;
      }
    }
    return {
      date: p.date,
      modality: p.modality,
      name: p.name ?? "",
      description: p.description ?? "",
      privateNotes: act?.private_notes ?? "",
      plannedId: p.id,
      activityId: act?.id ?? null,
      planned: {
        durationS: p.planned_duration_s,
        distanceM: p.planned_distance_m,
        tss: p.planned_tss,
      },
      completed: act ? activityToCompleted(act) : null,
      hasStreams: !!act?.route_polyline,
      structure,
    };
  }

  const a = getActivity(db, id);
  if (!a) return null;
  return {
    date: a.local_date,
    modality: a.modality,
    name: a.name ?? "",
    description: a.notes ?? "",
    privateNotes: a.private_notes ?? "",
    plannedId: null,
    activityId: a.id,
    planned: null,
    completed: activityToCompleted(a),
    hasStreams: !!a.route_polyline,
    structure: null,
  };
}
