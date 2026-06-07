import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { getAthlete } from "@/lib/db/repo";
import { getDashboardData } from "@/lib/queries/dashboard";
import { todayLocal } from "@/lib/util/dates";
import type { Units } from "@/lib/db/types";
import DashboardClient from "@/components/dashboard/DashboardClient";
import ChartsLibrary from "@/components/dashboard/ChartsLibrary";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const db = getDb();
  const tz = getAthlete(db)?.timezone ?? "America/New_York";
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const data = getDashboardData(db, todayLocal(tz));

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
      <div className="mb-3">
        <ChartsLibrary />
      </div>
      <DashboardClient data={data} units={units} />
    </div>
  );
}
