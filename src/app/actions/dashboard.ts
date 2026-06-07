"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { setSetting } from "@/lib/db/repo";
import { reprocessAll } from "@/lib/import/reprocess";
import { DASHBOARD_CHARTS_KEY } from "@/lib/dashboard/charts";

/** Persist the dashboard's active chart list (ordered ids). */
export async function setDashboardCharts(ids: string[]): Promise<void> {
  setSetting(getDb(), DASHBOARD_CHARTS_KEY, JSON.stringify(ids));
  revalidatePath("/dashboard");
}

/**
 * Recompute every activity's metrics from its streams and rebuild the fitness
 * curves — the dashboard "Recalculate" button, for when values look stale.
 */
export async function recalcMetrics(): Promise<{ count: number }> {
  const count = reprocessAll(getDb());
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/calendar");
  return { count };
}
