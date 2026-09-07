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
import { plannedCopyOf } from "@/lib/workout/copy";
import { recomputeFitness } from "@/lib/fitness/recompute";
import { isReadOnly } from "@/lib/auth/config";

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

/** Paste a copied calendar item onto `date` as a new planned workout. False if the source is gone. */
export async function copyItem(
  kind: "activity" | "planned",
  id: number,
  date: string,
): Promise<boolean> {
  if (isReadOnly() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const db = getDb();
  const row = kind === "activity" ? getActivity(db, id) : getPlanned(db, id);
  if (!row) return false;
  insertPlanned(db, plannedCopyOf(row, date));
  revalidatePath("/calendar");
  return true;
}
