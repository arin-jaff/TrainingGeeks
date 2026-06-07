import { getDb } from "@/lib/db/client";
import { getAthlete, listInjuries } from "@/lib/db/repo";
import { getMetricsData } from "@/lib/queries/metrics";
import InjuryPanel from "@/components/metrics/InjuryPanel";
import { WELLNESS_BY_ID, WELLNESS_TYPES } from "@/lib/metrics/wellness";
import { todayLocal } from "@/lib/util/dates";
import { addMetric } from "@/app/actions/metrics";
import MetricChart from "@/components/metrics/MetricChart";
import TypeSelect from "@/components/metrics/TypeSelect";

export const dynamic = "force-dynamic";

const input =
  "rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent";

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const db = getDb();
  const tz = getAthlete(db)?.timezone ?? "America/New_York";
  const today = todayLocal(tz);
  const { type } = await searchParams;
  const selected = WELLNESS_BY_ID[type ?? ""] ? type! : "weight";
  const data = getMetricsData(db, selected, today);
  const sel = WELLNESS_BY_ID[selected];
  const injuries = listInjuries(db);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-ink">Metrics</h1>

      {/* Latest values */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {WELLNESS_TYPES.map((t) => {
          const v = data.latest[t.id];
          return (
            <div key={t.id} className="rounded border border-line bg-surface-card px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-ink-muted">
                {t.label}
              </div>
              <div className="text-lg font-semibold tabular-nums text-ink">
                {v ? v.value.toFixed(t.decimals) : "—"}
                <span className="ml-1 text-[11px] font-normal text-ink-muted">
                  {t.unit}
                </span>
              </div>
              {v && (
                <div className="text-[10px] text-ink-muted">{v.date}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trend */}
        <section className="lg:col-span-2 rounded border border-line bg-surface-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">{sel.label} trend</h2>
            <TypeSelect types={WELLNESS_TYPES} selected={selected} />
          </div>
          <MetricChart series={data.series} label={sel.label} unit={sel.unit} />
        </section>

        {/* Log + recent */}
        <section className="rounded border border-line bg-surface-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Log a metric</h2>
          <form action={addMetric} className="space-y-2">
            <select name="type" defaultValue={selected} className={`${input} w-full`}>
              {WELLNESS_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.unit})
                </option>
              ))}
            </select>
            <input name="date" type="date" defaultValue={today} className={`${input} w-full`} />
            <input name="value" type="number" step="any" placeholder="Value" required className={`${input} w-full`} />
            <input name="notes" placeholder="Notes (optional)" className={`${input} w-full`} />
            <button className="w-full rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover">
              Save
            </button>
          </form>

          <h3 className="mb-1 mt-5 text-sm font-semibold text-ink">Recent</h3>
          <ul className="divide-y divide-line text-sm">
            {data.recent.length === 0 && (
              <li className="py-2 text-ink-muted">No entries yet.</li>
            )}
            {data.recent.map((m) => (
              <li key={m.id} className="flex justify-between py-1.5">
                <span className="text-ink-muted">
                  {WELLNESS_BY_ID[m.type]?.label ?? m.type}
                </span>
                <span className="tabular-nums text-ink">
                  {m.value} <span className="text-ink-muted">· {m.date}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6">
        <InjuryPanel injuries={injuries} today={today} />
      </div>
    </div>
  );
}
