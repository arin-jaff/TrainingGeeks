"use client";

import { useState, type ReactNode } from "react";
import type { DashboardData } from "@/lib/queries/dashboard";
import type { LoadCurve } from "@/lib/fitness/recompute";
import {
  DurationByWeekChart,
  FitnessSummaryPie,
  PmcChart,
  StatTiles,
  ZoneTimeChart,
} from "./charts";
import type { Units } from "@/lib/db/types";
import { FATIGUE_COLOR } from "@/lib/util/colors";
import EmptyState from "@/components/EmptyState";
import ChartsLibrary from "./ChartsLibrary";
import RecalcButton from "./RecalcButton";
import { setDashboardCharts } from "@/app/actions/dashboard";
import { IMPLEMENTED } from "@/lib/dashboard/charts";

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

// id → display name (inverse of the library's name→id map).
const CHART_TITLES: Record<string, string> = Object.fromEntries(
  Object.entries(IMPLEMENTED).map(([name, id]) => [id, name]),
);
const SPAN2 = new Set(["pmc"]);

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
            o.key === value ? "bg-accent text-white" : "text-ink-muted hover:bg-surface",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function fmtMD(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${m}/${d}/${y}`;
}

function ChartTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2 text-center">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
    </div>
  );
}

/** A removable chart card. */
function Card({
  id,
  span2,
  onRemove,
  children,
}: {
  id: string;
  span2?: boolean;
  onRemove: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <section
      className={`relative rounded border border-line bg-surface-card p-4 ${span2 ? "lg:col-span-2" : ""}`}
    >
      <button
        onClick={() => onRemove(id)}
        aria-label="Remove chart"
        title="Remove chart"
        className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-surface hover:text-fatigue"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      {children}
    </section>
  );
}

export default function DashboardClient({
  data,
  units,
  initialCharts,
}: {
  data: DashboardData;
  units: Units;
  initialCharts: string[];
}) {
  const [curve, setCurve] = useState<LoadCurve>("all");
  const [days, setDays] = useState(90);
  const [charts, setCharts] = useState<string[]>(initialCharts);

  const points = (data.pmc[curve] ?? []).slice(-days);
  const curveLabel = CURVES.find((c) => c.key === curve)?.label ?? "All";
  const range =
    points.length > 1
      ? `${fmtMD(points[0].date)} – ${fmtMD(points[points.length - 1].date)}`
      : undefined;

  function persist(next: string[]) {
    setCharts(next);
    void setDashboardCharts(next);
  }
  const remove = (id: string) => persist(charts.filter((c) => c !== id));
  const add = (id: string) => {
    if (!charts.includes(id)) persist([...charts, id]);
  };

  function renderChart(id: string): ReactNode {
    switch (id) {
      case "pmc":
        return (
          <>
            <div className="relative mb-2 flex items-center">
              <div className="mx-auto">
                <ChartTitle
                  title={`Performance Management — ${curveLabel === "All" ? "All Workout Types" : curveLabel}`}
                  subtitle={range}
                />
              </div>
              <div className="absolute right-8 flex items-center gap-3">
                <Pills options={CURVES} value={curve} onChange={(v) => setCurve(v as LoadCurve)} />
                <Pills options={RANGES.map((r) => ({ key: r.days, label: r.label }))} value={days} onChange={(v) => setDays(v as number)} />
              </div>
            </div>
            <PmcChart points={points} />
          </>
        );
      case "fitness-summary":
        return (
          <>
            <ChartTitle title="Fitness Summary: Completed Duration" subtitle="Last 28 days" />
            {data.summary.length ? (
              <FitnessSummaryPie slices={data.summary} />
            ) : (
              <EmptyState title="No activities yet" description="Nothing logged in the last 28 days." />
            )}
          </>
        );
      case "duration-by-week":
        return (
          <>
            <ChartTitle title="Duration by Week" subtitle="Last 12 weeks · hours" />
            <DurationByWeekChart weeks={data.durationByWeek} />
          </>
        );
      case "hr-zones":
        return (
          <>
            <ChartTitle title="Time in Heart Rate Zones" subtitle="Last 120 days" />
            {data.hrZoneTime ? (
              <ZoneTimeChart data={data.hrZoneTime} color={FATIGUE_COLOR} />
            ) : (
              <EmptyState title="No HR data" description="No heart-rate streams in the last 120 days." />
            )}
          </>
        );
      case "power-zones":
        return (
          <>
            <ChartTitle title="Time in Power Zones" subtitle="Last 120 days" />
            {data.powerZoneTime ? (
              <ZoneTimeChart data={data.powerZoneTime} color="#7b2d8e" />
            ) : (
              <EmptyState title="No power data" description="No power streams in the last 120 days." />
            )}
          </>
        );
      default:
        return null;
    }
  }

  const valid = charts.filter((id) => CHART_TITLES[id]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <ChartsLibrary active={valid} onAdd={add} />
        <RecalcButton />
      </div>

      <div>
        <p className="mb-1 text-xs text-ink-muted">Last 28 days</p>
        <StatTiles totals={data.totals} units={units} />
      </div>

      {valid.length === 0 ? (
        <EmptyState
          title="No charts on your dashboard"
          description="Open the Charts Library to add one."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {valid.map((id) => (
            <Card key={id} id={id} span2={SPAN2.has(id)} onRemove={remove}>
              {renderChart(id)}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
