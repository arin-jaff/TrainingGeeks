import { getDb } from "@/lib/db/client";
import { getAthlete } from "@/lib/db/repo";
import { getProgressionData } from "@/lib/queries/progression";
import type { Units } from "@/lib/db/types";
import ProgressionView from "@/components/progression/ProgressionView";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default function ProgressionPage() {
  const db = getDb();
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const { activities, bests } = getProgressionData(db, units);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-ink">Progression</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProgressionView activities={activities} units={units} />
        </div>

        <section className="rounded border border-line bg-surface-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Personal Bests</h2>
          {bests.length === 0 ? (
            <EmptyState
              title="No personal bests yet"
              description="Import activities to start tracking your bests."
            />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {bests.map((b) => (
                <li key={b.label} className="flex items-baseline justify-between py-2">
                  <span className="text-ink-muted">{b.label}</span>
                  <span className="text-right">
                    <span className="font-semibold tabular-nums text-ink">{b.value}</span>
                    {b.date && (
                      <span className="ml-2 text-[11px] text-ink-muted">{b.date}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
