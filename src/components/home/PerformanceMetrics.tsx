"use client";

import { useState } from "react";
import type { CurveMetrics } from "@/lib/queries/home";
import Sparkline from "@/components/Sparkline";

function Box({
  label,
  value,
  bg,
}: {
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <div className={`flex-1 rounded ${bg} px-3 py-2 text-center text-white`}>
      <div className="text-2xl font-semibold tabular-nums">
        {Math.round(value)}
      </div>
      <div className="text-[10px] font-medium uppercase tracking-wide opacity-90">
        {label}
      </div>
    </div>
  );
}

function RampTile({
  label,
  delta,
  spark,
}: {
  label: string;
  delta: number;
  spark: number[];
}) {
  const positive = delta >= 0;
  return (
    <div className="rounded border border-line p-2">
      <div className="flex items-baseline justify-between">
        <span
          className={`text-sm font-semibold tabular-nums ${
            positive ? "text-modality-run" : "text-fatigue"
          }`}
        >
          {positive ? "+" : ""}
          {delta}
        </span>
      </div>
      <Sparkline
        data={spark.length ? spark : [0, 0]}
        width={120}
        height={28}
        className={positive ? "text-modality-run" : "text-fatigue"}
      />
      <div className="text-[10px] text-ink-muted">{label}</div>
    </div>
  );
}

export default function PerformanceMetrics({
  curves,
}: {
  curves: CurveMetrics[];
}) {
  const [key, setKey] = useState(curves[0]?.key ?? "all");
  const c = curves.find((x) => x.key === key) ?? curves[0];
  if (!c) return null;

  return (
    <section className="rounded border border-line bg-surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Performance Metrics</h2>
      </div>

      {/* Modality toggle */}
      <div className="mb-3 flex flex-wrap gap-1">
        {curves.map((cv) => (
          <button
            key={cv.key}
            onClick={() => setKey(cv.key)}
            className={[
              "rounded px-2 py-0.5 text-xs font-medium",
              cv.key === key
                ? "bg-accent text-white"
                : "text-ink-muted hover:bg-surface",
            ].join(" ")}
          >
            {cv.label}
          </button>
        ))}
      </div>

      {/* Fatigue / Fitness / Form */}
      <div className="mb-4 flex gap-2">
        <Box label="Fatigue" value={c.atl} bg="bg-fatigue" />
        <Box label="Fitness" value={c.ctl} bg="bg-fitness" />
        <Box label="Form" value={c.tsb} bg="bg-form" />
      </div>

      {/* Fitness ramp rates */}
      <h3 className="mb-2 text-xs font-semibold text-ink">Fitness Ramp Rates</h3>
      <div className="grid grid-cols-2 gap-2">
        <RampTile label="Last 7 days" delta={c.ramp7} spark={c.spark.slice(-7)} />
        <RampTile label="Last 30 days" delta={c.ramp30} spark={c.spark.slice(-30)} />
        <RampTile label="Last 90 days" delta={c.ramp90} spark={c.spark} />
        <RampTile label="Last 365 days" delta={c.ramp365} spark={c.spark} />
      </div>
    </section>
  );
}
