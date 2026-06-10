"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { isReadOnly } from "@/lib/auth/config";
import { replaceStrengthSets } from "@/lib/db/repo";

export interface StrengthSetInput {
  exerciseKey: string;
  exerciseName: string;
  reps: number | null;
  durationS: number | null;
  restS: number | null;
  weightKg: number | null;
}

/** Replace an activity's strength sets from the editor (weights already in kg). */
export async function saveStrengthSets(
  activityId: number,
  rows: StrengthSetInput[],
): Promise<{ ok: boolean }> {
  if (isReadOnly()) return { ok: false };
  const db = getDb();
  replaceStrengthSets(
    db,
    activityId,
    rows.map((r, i) => ({
      set_index: i,
      exercise_key: r.exerciseKey || "custom",
      exercise_name: r.exerciseName || null,
      reps: r.reps,
      duration_s: r.durationS,
      rest_s: r.restS,
      weight_kg: r.weightKg,
    })),
  );
  revalidatePath(`/activity/${activityId}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
  return { ok: true };
}
