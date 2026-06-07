import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { getAllSettings, getAthlete } from "@/lib/db/repo";
import { getDashboardData } from "@/lib/queries/dashboard";
import { todayLocal } from "@/lib/util/dates";
import type { Units } from "@/lib/db/types";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { DASHBOARD_CHARTS_KEY, DEFAULT_CHARTS } from "@/lib/dashboard/charts";

export const dynamic = "force-dynamic";

function readCharts(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_CHARTS;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as string[]) : DEFAULT_CHARTS;
  } catch {
    return DEFAULT_CHARTS;
  }
}

export default function DashboardPage() {
  const db = getDb();
  const tz = getAthlete(db)?.timezone ?? "America/New_York";
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const data = getDashboardData(db, todayLocal(tz));
  const charts = readCharts(getAllSettings(db)[DASHBOARD_CHARTS_KEY]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 border-b border-line">
        <span className="border-b-2 border-accent pb-2 text-sm font-semibold text-accent">
          Dashboard
        </span>
        <Link href="/progression" className="pb-2 text-sm text-ink-muted hover:text-ink">
          Progression
        </Link>
        <Link href="/metrics" className="pb-2 text-sm text-ink-muted hover:text-ink">
          Metrics
        </Link>
        <Link
          href="/workout-comparison"
          className="pb-2 text-sm text-ink-muted hover:text-ink"
        >
          Workout Comparison
        </Link>
      </div>
      <DashboardClient data={data} units={units} initialCharts={charts} />
    </div>
  );
}
