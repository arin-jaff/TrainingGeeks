"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { setActivityDate, setPlannedDate } from "@/lib/db/repo";
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
