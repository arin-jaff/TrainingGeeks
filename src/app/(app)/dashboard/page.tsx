import { getDb } from "@/lib/db/client";
import { getAthlete } from "@/lib/db/repo";
import { getDashboardData } from "@/lib/queries/dashboard";
import { todayLocal } from "@/lib/util/dates";
import DashboardClient from "@/components/dashboard/DashboardClient";
import ChartsLibrary from "@/components/dashboard/ChartsLibrary";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const db = getDb();
  const tz = getAthlete(db)?.timezone ?? "America/New_York";
  const data = getDashboardData(db, todayLocal(tz));

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 border-b border-line">
        <span className="border-b-2 border-accent pb-2 text-sm font-semibold text-accent">
          Dashboard
        </span>
        <span
          className="cursor-not-allowed pb-2 text-sm text-ink-muted"
          title="Coming soon"
        >
          Workout Comparison
        </span>
      </div>
      <div className="mb-3">
        <ChartsLibrary />
      </div>
      <DashboardClient data={data} />
    </div>
  );
}
