"use client";

import { useState } from "react";
import type { DashboardData } from "@/lib/queries/dashboard";
import type { LoadCurve } from "@/lib/fitness/recompute";
import {
  DurationByWeekChart,
  FitnessSummaryPie,
  PmcChart,
} from "./charts";

const CURVES: { key: LoadCurve; label: string }[] = [
  { key: "all", label: "All" },
  { key: "run", label: "Run" },
  { key: "bike", label: "Bike" },
  { key: "swim", label: "Swim" },
  { key: "strength", label: "Strength" },
];

const RANGES = [
  { label: "6w", days: 42 },
  { label: "3m", days: 90 },
  { label: "6m", days: 182 },
  { label: "1y", days: 365 },
];

function Pills<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={[
            "rounded px-2 py-0.5 text-xs font-medium",
            o.key === value
              ? "bg-accent text-white"
              : "text-ink-muted hover:bg-surface",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [curve, setCurve] = useState<LoadCurve>("all");
  const [days, setDays] = useState(90);
  const points = (data.pmc[curve] ?? []).slice(-days);

  return (
    <div className="space-y-4">
      <section className="rounded border border-line bg-surface-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">
            Performance Management
          </h2>
          <div className="flex items-center gap-3">
            <Pills
              options={CURVES}
              value={curve}
              onChange={(v) => setCurve(v as LoadCurve)}
            />
            <Pills
              options={RANGES.map((r) => ({ key: r.days, label: r.label }))}
              value={days}
              onChange={(v) => setDays(v as number)}
            />
          </div>
        </div>
        <PmcChart points={points} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded border border-line bg-surface-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">
            Fitness Summary
          </h2>
          <p className="mb-1 text-xs text-ink-muted">
            Completed duration · last 28 days
          </p>
          {data.summary.length ? (
            <FitnessSummaryPie slices={data.summary} />
          ) : (
            <p className="py-10 text-center text-sm text-ink-muted">
              No activities in the last 28 days.
            </p>
          )}
        </section>

        <section className="rounded border border-line bg-surface-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">
            Duration by Week
          </h2>
          <p className="mb-1 text-xs text-ink-muted">Last 12 weeks · hours</p>
          <DurationByWeekChart weeks={data.durationByWeek} />
        </section>
      </div>
    </div>
  );
}
