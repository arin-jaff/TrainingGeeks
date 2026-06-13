"use client";

import { useState } from "react";
import type { Modality, Units } from "@/lib/db/types";
import type { SplitRow } from "@/lib/queries/activity";
import { formatDuration, formatPace, formatSpeed } from "@/lib/util/format";

// HR zones as % of the max-HR anchor (standard 5-band model).
const HR_ZONE_COLORS = ["#9ca3af", "#3b82f6", "#22c55e", "#f97316", "#ef4444"];
function hrZoneColor(hr: number | null, anchor: number | null): string {
  if (!hr || !anchor || anchor <= 0) return "#cbd5e1";
  const pct = hr / anchor;
  if (pct < 0.6) return HR_ZONE_COLORS[0];
  if (pct < 0.7) return HR_ZONE_COLORS[1];
  if (pct < 0.8) return HR_ZONE_COLORS[2];
  if (pct < 0.9) return HR_ZONE_COLORS[3];
  return HR_ZONE_COLORS[4];
}

// Pace/effort colored relative to this activity: slowest cool → fastest hot.
const PACE_COLORS = ["#9ca3af", "#3b82f6", "#22c55e", "#f97316", "#ef4444"];
function paceColor(speed: number | null, min: number, max: number): string {
  if (!speed || max <= min) return "#cbd5e1";
  const t = (speed - min) / (max - min);
  return PACE_COLORS[Math.min(4, Math.max(0, Math.floor(t * 5)))];
}

function Bar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(4, Math.min(100, pct))}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-16 shrink-0 text-right tabular-nums text-ink">{label}</span>
    </div>
  );
}

export default function Splits({
  laps,
  autoSplits,
  splitUnitLabel,
  modality,
  units,
  hrZoneAnchor,
}: {
  laps: SplitRow[];
  autoSplits: SplitRow[];
  splitUnitLabel: string;
  modality: Modality;
  units: Units;
  hrZoneAnchor: number | null;
}) {
  const hasLaps = laps.length > 1;
  const hasSplits = autoSplits.length > 0;
  const [mode, setMode] = useState<"laps" | "splits">(hasLaps ? "laps" : "splits");

  if (!hasLaps && !hasSplits) return null;

  const rows = mode === "laps" ? laps : autoSplits;
  const isBike = modality === "bike";

  // Scales for the bars, taken across the visible rows.
  const speeds = rows.map((r) => r.avgSpeedMps ?? 0).filter((v) => v > 0);
  const minSpeed = speeds.length ? Math.min(...speeds) : 0;
  const maxSpeed = speeds.length ? Math.max(...speeds) : 1;
  const hrs = rows.map((r) => r.avgHr ?? 0).filter((v) => v > 0);
  const maxHr = hrs.length ? Math.max(...hrs) : 1;

  const paceText = (r: SplitRow) =>
    isBike
      ? formatSpeed(r.avgSpeedMps, units)
      : formatPace(r.avgSpeedMps, units, modality);

  const distText = (r: SplitRow) => {
    if (r.distanceM == null) return "—";
    if (modality === "swim") return `${Math.round(r.distanceM)} m`;
    const per = units === "imperial" ? 1609.34 : 1000;
    return `${(r.distanceM / per).toFixed(2)} ${units === "imperial" ? "mi" : "km"}`;
  };

  const tab = (active: boolean) =>
    [
      "rounded px-3 py-1 text-xs font-medium",
      active ? "bg-accent text-white" : "border border-accent/50 text-accent hover:bg-accent/5",
    ].join(" ");

  return (
    <section className="rounded border border-line bg-surface-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="mr-1 text-sm font-semibold text-ink">Splits</h3>
        {hasLaps && (
          <button onClick={() => setMode("laps")} className={tab(mode === "laps")}>
            Laps
          </button>
        )}
        {hasSplits && (
          <button onClick={() => setMode("splits")} className={tab(mode === "splits")}>
            {splitUnitLabel}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead>
            <tr className="text-ink-muted">
              <th className="px-2 py-1 text-left font-medium">#</th>
              <th className="px-2 py-1 text-right font-medium">Dist</th>
              <th className="px-2 py-1 text-right font-medium">Time</th>
              <th className="px-2 py-1 text-left font-medium">{isBike ? "Speed" : "Pace"}</th>
              <th className="px-2 py-1 text-left font-medium">HR</th>
              {isBike && <th className="px-2 py-1 text-right font-medium">Power</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-2 py-1.5 text-ink-muted tabular-nums">{i + 1}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-ink">{distText(r)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-ink">
                  {formatDuration(r.durationS)}
                </td>
                <td className="w-[34%] px-2 py-1.5">
                  <Bar
                    pct={r.avgSpeedMps ? (r.avgSpeedMps / maxSpeed) * 100 : 0}
                    color={paceColor(r.avgSpeedMps, minSpeed, maxSpeed)}
                    label={paceText(r)}
                  />
                </td>
                <td className="w-[26%] px-2 py-1.5">
                  <Bar
                    pct={r.avgHr ? (r.avgHr / maxHr) * 100 : 0}
                    color={hrZoneColor(r.avgHr, hrZoneAnchor)}
                    label={r.avgHr ? String(Math.round(r.avgHr)) : "—"}
                  />
                </td>
                {isBike && (
                  <td className="px-2 py-1.5 text-right tabular-nums text-ink">
                    {r.avgPower ? Math.round(r.avgPower) : "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
