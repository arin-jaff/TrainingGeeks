"use client";

import { useState } from "react";
import type { CurveMetrics } from "@/lib/queries/home";
import Sparkline from "@/components/Sparkline";
import { FATIGUE_COLOR, FITNESS_COLOR, FORM_COLOR, STRENGTH_COLOR } from "@/lib/util/colors";

// TP home: Fatigue & Form are outlined, only Fitness is filled blue.
function Box({
  label,
  value,
  color,
  filled,
}: {
  label: string;
  value: number;
  color: string;
  filled?: boolean;
}) {
  const style = filled
    ? { backgroundColor: color, color: "#fff", borderColor: color }
    : { color, borderColor: color, backgroundColor: "#fff" };
  return (
    <div
      className="flex flex-1 flex-col items-center rounded border-2 px-2 py-1.5"
      style={style}
    >
      <span className={`tabular-nums ${filled ? "text-3xl" : "text-2xl"} font-semibold`}>
        {Math.round(value)}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

function RampTile({
  label,
  delta,
  spark,
  color = FITNESS_COLOR,
}: {
  label: string;
  delta: number;
  spark: number[];
  color?: string;
}) {
  return (
    <div className="rounded border border-line p-2">
      <div className="text-lg font-medium tabular-nums" style={{ color }}>
        {delta >= 0 ? "+" : ""}
        {delta}
      </div>
      <Sparkline
        data={spark.length ? spark : [0, 0]}
        width={120}
        height={28}
        className="text-[#7d8aa3]"
      />
      <div className="text-[11px] text-ink-muted">{label}</div>
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
  const isStrength = key === "strength";
  const scoreColor = isStrength ? STRENGTH_COLOR : FITNESS_COLOR;

  return (
    <section className="rounded border border-line bg-surface-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink">Performance Metrics</h2>

      <div className="mb-3 flex flex-wrap gap-1">
        {curves.map((cv) => (
          <button
            key={cv.key}
            onClick={() => setKey(cv.key)}
            className={[
              "rounded px-2 py-0.5 text-xs font-medium",
              cv.key === key ? "bg-accent text-white" : "text-ink-muted hover:bg-surface",
            ].join(" ")}
          >
            {cv.label}
          </button>
        ))}
      </div>

      <div className="mb-1 flex items-stretch gap-2">
        <Box label="Fatigue" value={c.atl} color={FATIGUE_COLOR} />
        <Box
          label={isStrength ? "Strength" : "Fitness"}
          value={c.ctl}
          color={scoreColor}
          filled
        />
        <Box label="Form" value={c.tsb} color={FORM_COLOR} />
      </div>
      {isStrength && (
        <p className="mb-3 text-[11px] text-ink-muted">
          Strength load (S³) is tracked separately — it&apos;s not part of your overall Fitness.
        </p>
      )}

      <h3 className="mb-2 mt-3 text-xs font-semibold text-ink">
        {isStrength ? "Strength" : "Fitness"} Ramp Rates
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <RampTile label="Last 7 days" delta={c.ramp7} spark={c.spark.slice(-7)} color={scoreColor} />
        <RampTile label="Last 28 days" delta={c.ramp30} spark={c.spark.slice(-28)} color={scoreColor} />
        <RampTile label="Last 90 days" delta={c.ramp90} spark={c.spark} color={scoreColor} />
        <RampTile label="Last 365 days" delta={c.ramp365} spark={c.spark} color={scoreColor} />
      </div>
    </section>
  );
}
