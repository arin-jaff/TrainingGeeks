"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import {
  getActivity,
  getPlanned,
  insertPlanned,
  setActivityDate,
  setPlannedDate,
} from "@/lib/db/repo";
import type { ActivityRow, PlannedWorkoutRow } from "@/lib/db/types";
import { plannedCopyOf } from "@/lib/workout/copy";
import { recomputeFitness } from "@/lib/fitness/recompute";

/** Move an activity or planned workout to a new calendar date. */
export async function rescheduleItem(
  kind: "activity" | "planned",
  id: number,
  date: string,
): Promise<void> {
  const db = getDb();
  if (kind === "activity") {
    setActivityDate(db, id, date);
    recomputeFitness(db); // moving load shifts the fitness curves
  } else {
    setPlannedDate(db, id, date);
  }
  revalidatePath("/calendar");
}

/** Paste a copied calendar item onto `date` as a new planned workout. */
export async function copyItem(
  kind: "activity" | "planned",
  id: number,
  date: string,
): Promise<number | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const db = getDb();
  const row = kind === "activity" ? getActivity(db, id) : getPlanned(db, id);
  if (!row) return null;
  const planned = plannedCopyOf(
    kind === "activity"
      ? { kind, row: row as ActivityRow }
      : { kind, row: row as PlannedWorkoutRow },
    date,
  );
  const newId = insertPlanned(db, planned);
  revalidatePath("/calendar");
  return newId;
}
