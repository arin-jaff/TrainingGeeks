"use client";

import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import EChart from "@/components/charts/EChart";
import type { ProgressionActivity } from "@/lib/queries/progression";
import type { Modality, Units } from "@/lib/db/types";
import { monthOf, startOfWeekMonday } from "@/lib/util/dates";
import { MODALITY_COLOR } from "@/lib/util/colors";

type Metric = "distance" | "duration" | "load" | "elevation" | "count";
type Sport = "all" | "run" | "bike" | "swim" | "strength";
type Group = "week" | "month";

const METRICS: { key: Metric; label: string }[] = [
  { key: "load", label: "Training Load" },
  { key: "distance", label: "Distance" },
  { key: "duration", label: "Duration" },
  { key: "elevation", label: "Elevation" },
  { key: "count", label: "Workouts" },
];
const SPORTS: { key: Sport; label: string }[] = [
  { key: "all", label: "All" },
  { key: "run", label: "Run" },
  { key: "bike", label: "Bike" },
  { key: "swim", label: "Swim" },
  { key: "strength", label: "Strength" },
];

function inSport(m: Modality, s: Sport): boolean {
  if (s === "all") return true;
  if (s === "strength") return m === "lift" || m === "core";
  return m === s;
}

function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
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

export default function ProgressionView({
  activities,
  units,
}: {
  activities: ProgressionActivity[];
  units: Units;
}) {
  const [metric, setMetric] = useState<Metric>("load");
  const [sport, setSport] = useState<Sport>("all");
  const [group, setGroup] = useState<Group>("week");

  const per = units === "imperial" ? 1609.34 : 1000;
  const elevFactor = units === "imperial" ? 3.28084 : 1;

  const { keys, values, unit } = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const a of activities) {
      if (!inSport(a.modality, sport)) continue;
      const key = group === "week" ? startOfWeekMonday(a.date) : monthOf(a.date);
      let v = 0;
      if (metric === "distance") v = a.distanceM / per;
      else if (metric === "duration") v = a.durationS / 3600;
      else if (metric === "load") v = a.load;
      else if (metric === "elevation") v = a.elevationM * elevFactor;
      else v = 1;
      buckets.set(key, (buckets.get(key) ?? 0) + v);
    }
    const keys = [...buckets.keys()].sort();
    const values = keys.map((k) => Math.round((buckets.get(k) ?? 0) * 10) / 10);
    const unit =
      metric === "distance"
        ? units === "imperial" ? "mi" : "km"
        : metric === "duration" ? "h"
          : metric === "elevation" ? (units === "imperial" ? "ft" : "m")
            : metric === "load" ? "TSS/S³" : "";
    return { keys, values, unit };
  }, [activities, metric, sport, group, per, elevFactor, units]);

  const color = sport === "all" ? "#2f6fed" : MODALITY_COLOR[sport === "strength" ? "lift" : (sport as Modality)];
  const md = (k: string) => (group === "week" ? `${Number(k.slice(5, 7))}/${Number(k.slice(8, 10))}` : k);

  const option: EChartsOption = {
    grid: { left: 48, right: 16, top: 16, bottom: 40 },
    tooltip: { trigger: "axis", valueFormatter: (v) => `${v} ${unit}` },
    xAxis: {
      type: "category",
      data: keys.map(md),
      axisLabel: { fontSize: 10, color: "#6b7280", rotate: keys.length > 16 ? 45 : 0 },
    },
    yAxis: { type: "value", name: unit, axisLabel: { fontSize: 10, color: "#6b7280" } },
    series: [{ type: "bar", data: values, itemStyle: { color }, barMaxWidth: 22 }],
  };

  return (
    <section className="rounded border border-line bg-surface-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Pills options={METRICS} value={metric} onChange={(v) => setMetric(v as Metric)} />
        <div className="flex items-center gap-3">
          <Pills options={SPORTS} value={sport} onChange={(v) => setSport(v as Sport)} />
          <Pills
            options={[{ key: "week", label: "Weekly" }, { key: "month", label: "Monthly" }]}
            value={group}
            onChange={(v) => setGroup(v as Group)}
          />
        </div>
      </div>
      {keys.length > 0 ? (
        <EChart option={option} height={340} />
      ) : (
        <p className="py-16 text-center text-sm text-ink-muted">No data for this selection.</p>
      )}
    </section>
  );
}
