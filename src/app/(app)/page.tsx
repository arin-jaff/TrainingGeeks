import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { isReadOnly } from "@/lib/auth/config";
import { getAthlete, latestMetrics } from "@/lib/db/repo";
import { getHomeData, type PeakBest } from "@/lib/queries/home";
import { getSportSummaries } from "@/lib/queries/sports";
import { getExerciseMaxes } from "@/lib/queries/strength";
import { WELLNESS_BY_ID } from "@/lib/metrics/wellness";
import type { CalItem } from "@/lib/queries/calendar";
import type { Units } from "@/lib/db/types";
import { todayLocal } from "@/lib/util/dates";
import { formatDistance, formatDuration, formatPace } from "@/lib/util/format";
import GettingStarted from "@/components/home/GettingStarted";
import SportsBar from "@/components/home/SportsBar";
import PerformanceMetrics from "@/components/home/PerformanceMetrics";
import EventsPanel from "@/components/home/EventsPanel";
import GoalsPanel from "@/components/home/GoalsPanel";
import StrengthMaxes from "@/components/home/StrengthMaxes";

export const dynamic = "force-dynamic";

const BORDER: Record<string, string> = {
  run: "border-l-modality-run",
  bike: "border-l-modality-bike",
  swim: "border-l-modality-swim",
  lift: "border-l-modality-strength",
  core: "border-l-modality-core",
};

function distanceLabel(m: number): string {
  if (Math.abs(m - 1609.34) < 1) return "1 mi";
  if (m >= 1000) return `${m / 1000} km`;
  return `${m} m`;
}

function WorkoutRow({ item, units }: { item: CalItem; units: Units }) {
  const body = (
    <div
      className={`rounded border border-line border-l-4 bg-surface-card px-3 py-2 ${BORDER[item.modality]} ${item.kind === "activity" ? "transition-colors hover:bg-surface" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{item.name}</span>
        {item.stressValue != null && (
          <span className="text-xs text-ink-muted">
            {item.stressValue} {item.stressLabel}
          </span>
        )}
      </div>
      <div className="mt-0.5 flex gap-3 text-xs text-ink-muted">
        {item.durationS != null && <span>{formatDuration(item.durationS)}</span>}
        {item.distanceM != null && (
          <span>{formatDistance(item.distanceM, units)}</span>
        )}
        {item.kind === "planned" && <span className="italic">planned</span>}
      </div>
    </div>
  );
  return item.kind === "activity" ? (
    <Link href={`/activity/${item.id}`}>{body}</Link>
  ) : (
    body
  );
}

function DayColumn({
  title,
  items,
  units,
  readOnly,
}: {
  title: string;
  items: CalItem[];
  units: Units;
  readOnly: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {!readOnly && (
          <Link href="/import" className="text-lg leading-none text-ink-muted hover:text-accent">
            +
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <div className="rounded border border-line bg-surface-card px-3 py-6 text-center">
          <p className="mb-2 text-sm text-ink-muted">
            No scheduled workouts {title === "Today" ? "today" : "tomorrow"}.
          </p>
          {!readOnly && (
            <Link
              href="/import"
              className="inline-block rounded bg-accent px-3 py-1 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Add a Workout
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <WorkoutRow key={`${it.kind}:${it.id}`} item={it} units={units} />
          ))}
        </div>
      )}
    </div>
  );
}

const MEDAL_SRC = ["/medal-gold.png", "/medal-silver.png", "/medal-bronze.png"];

function PeakPerformances({
  bests,
  units,
}: {
  bests: PeakBest[];
  units: Units;
}) {
  return (
    <section className="rounded border border-line bg-surface-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Peak Performances</h2>
        <Link href="/peaks" className="text-xs font-medium text-accent">
          View All
        </Link>
      </div>
      {bests.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Import runs to see your best efforts by distance.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {bests.map((b, i) => (
            <li key={b.window} className="flex items-center gap-3 text-sm">
              {i < 3 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={MEDAL_SRC[i]} alt={`#${i + 1}`} className="h-5 w-5 object-contain" />
              ) : (
                <span className="w-5 text-center text-xs text-ink-muted">{i + 1}</span>
              )}
              <span className="w-16 font-medium tabular-nums text-ink">
                {formatDuration(b.window / b.speed)}
              </span>
              <span className="text-ink-muted">{distanceLabel(b.window)}</span>
              <span className="ml-auto text-xs text-ink-muted">
                {formatPace(b.speed, units, "run")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function HomePage() {
  const db = getDb();
  const athlete = getAthlete(db);
  const units: Units = athlete?.units ?? "imperial";
  const tz = athlete?.timezone ?? "America/New_York";
  const today = todayLocal(tz);
  const data = getHomeData(db, today);
  const sports = getSportSummaries(db, today);
  const strengthMaxes = getExerciseMaxes(db);
  const wellness = latestMetrics(db);
  const readOnly = isReadOnly();
  const hasActivities =
    (db.prepare("SELECT COUNT(*) AS n FROM activity").get() as { n: number }).n > 0;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/avatar.png"
          alt=""
          className="h-9 w-9 rounded-full border border-line object-cover"
        />
        <h1 className="text-lg font-semibold text-ink">
          {athlete?.name ?? "Athlete"}
        </h1>
      </div>

      {/* First run: a concrete path into the app until data exists. */}
      {!hasActivities && !readOnly && <GettingStarted />}

      {/* Your Sports — hover a sport for last activity + week/all-time stats. */}
      <SportsBar sports={sports} units={units} today={today} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Events + Goals */}
        <div className="space-y-4">
          <EventsPanel events={data.events} today={today} />
          <GoalsPanel goals={data.goals} />
        </div>

        {/* Center: Today + Tomorrow */}
        <div className="space-y-4">
          <DayColumn title="Today" items={data.todayItems} units={units} readOnly={readOnly} />
          <DayColumn title="Tomorrow" items={data.tomorrowItems} units={units} readOnly={readOnly} />
        </div>

        {/* Right: Performance Metrics + Peak Performances */}
        <div className="space-y-4">
          <PerformanceMetrics curves={data.curves} />
          <PeakPerformances bests={data.peakBests} units={units} />
          <StrengthMaxes maxes={strengthMaxes} units={units} />
          <section className="rounded border border-line bg-surface-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Body Metrics</h2>
              <Link href="/metrics" className="text-xs font-medium text-accent">
                Log / View All
              </Link>
            </div>
            {wellness.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Track weight, resting HR, HRV and sleep over time.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {wellness
                  .filter((m) => WELLNESS_BY_ID[m.type])
                  .slice(0, 6)
                  .map((m) => {
                    const t = WELLNESS_BY_ID[m.type];
                    return (
                      <li key={m.type} className="flex justify-between">
                        <span className="text-ink-muted">{t.label}</span>
                        <span className="tabular-nums text-ink">
                          {m.value.toFixed(t.decimals)} {t.unit}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
