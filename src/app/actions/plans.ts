"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { deleteAllPlannedBySource, insertPlanned } from "@/lib/db/repo";
import { getPlan, planToPlanned } from "@/lib/training-plans/apply";
import { planSource } from "@/lib/training-plans/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Schedule a plan onto the calendar starting at `startDate` (a Monday). */
export async function applyPlan(
  planId: string,
  startDate: string,
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const plan = getPlan(planId);
  if (!plan) return { ok: false, error: "Unknown plan." };
  if (!DATE_RE.test(startDate)) return { ok: false, error: "Invalid start date." };

  const db = getDb();
  // Replace any prior scheduling of this plan, then insert fresh.
  deleteAllPlannedBySource(db, planSource(planId));
  const rows = planToPlanned(plan, startDate);
  for (const r of rows) insertPlanned(db, r);

  revalidatePath("/atp");
  revalidatePath("/calendar");
  return { ok: true, count: rows.length };
}

/** Remove a scheduled plan (keeps any days already marked complete). */
export async function removePlan(planId: string): Promise<void> {
  deleteAllPlannedBySource(getDb(), planSource(planId));
  revalidatePath("/atp");
  revalidatePath("/calendar");
}
