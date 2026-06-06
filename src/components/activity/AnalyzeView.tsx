"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ActivityDetail } from "@/lib/queries/activity";
import type { Modality, Units } from "@/lib/db/types";
import {
  formatDistance,
  formatDuration,
  formatPace,
  round,
} from "@/lib/util/format";
import type { StreamSeries } from "./StreamChart";

// maplibre-gl / uPlot are browser-only; never evaluate them during SSR.
const StreamChart = dynamic(() => import("./StreamChart"), { ssr: false });
const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false });

function distanceLabel(m: number): string {
  if (Math.abs(m - 1609.34) < 1) return "1 mi";
  if (Math.abs(m - 16093.4) < 5) return "10 mi";
  if (Math.abs(m - 21097.5) < 5) return "Half";
  if (m >= 1000) return `${m / 1000} km`;
  return `${m} m`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-surface-card px-3 py-2">
      <div className="text-sm font-semibold tabular-nums text-ink">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </div>
    </div>
  );
}

export default function AnalyzeView({
  detail,
  units,
}: {
  detail: ActivityDetail;
  units: Units;
}) {
  const [tab, setTab] = useState<"analyze" | "summary">("analyze");
  const a = detail.activity;
  const modality = a.modality as Modality;
  const s = detail.stream;

  const series: StreamSeries[] = [];
  if (s) {
    if (s.alt.some((v) => v !== null))
      series.push({
        label: "Elevation (m)",
        data: s.alt,
        color: "#9ca3af",
        scale: "alt",
        fill: "rgba(156,163,175,0.18)",
      });
    if (s.hr.some((v) => v !== null))
      series.push({ label: "HR (bpm)", data: s.hr, color: "#e15554", scale: "hr" });
    if (s.power.some((v) => v !== null))
      series.push({
        label: "Power (W)",
        data: s.power,
        color: "#8b5cf6",
        scale: "pwr",
      });
    if (s.speed.some((v) => v !== null))
      series.push({
        label: "Speed (m/s)",
        data: s.speed,
        color: "#2f9e6b",
        scale: "spd",
      });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 border-b border-line">
        {(["analyze", "summary"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "pb-2 text-sm capitalize",
              tab === t
                ? "border-b-2 border-accent font-semibold text-accent"
                : "text-ink-muted",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "analyze" ? (
        <div className="space-y-4">
          {detail.hasGps && s && (
            <RouteMap lat={s.lat} lng={s.lng} />
          )}
          {series.length > 0 && s && (
            <div className="rounded border border-line bg-surface-card p-3">
              <StreamChart time={s.time} series={series} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {detail.powerPeaks.length > 0 && (
              <PeakPanel
                title="Peak Power by Duration"
                rows={detail.powerPeaks.map((p) => ({
                  label: formatDuration(p.window),
                  value: `${Math.round(p.value)} W`,
                }))}
              />
            )}
            {detail.pacePeaks.length > 0 && (
              <PeakPanel
                title="Peak Pace by Distance"
                rows={detail.pacePeaks.map((p) => ({
                  label: distanceLabel(p.window),
                  value: `${formatDuration(p.window / p.speed)} · ${formatPace(p.speed, units, modality)}`,
                }))}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <Metric label="Duration" value={formatDuration(a.duration_s)} />
          <Metric label="Distance" value={formatDistance(a.distance_m, units)} />
          <Metric label="Avg Pace" value={formatPace(a.avg_speed_mps, units, modality)} />
          <Metric label="Elev Gain" value={a.elevation_gain_m != null ? `${Math.round(a.elevation_gain_m)} m` : "—"} />
          <Metric label="Avg HR" value={a.avg_hr != null ? `${Math.round(a.avg_hr)}` : "—"} />
          <Metric label="Max HR" value={a.max_hr != null ? `${Math.round(a.max_hr)}` : "—"} />
          <Metric label="Avg Power" value={a.avg_power != null ? `${Math.round(a.avg_power)} W` : "—"} />
          <Metric label="NP" value={a.np != null ? `${Math.round(a.np)} W` : "—"} />
          <Metric label="IF" value={round(a.intensity_factor, 2)} />
          <Metric label="VI" value={round(a.variability_index, 2)} />
          <Metric label="EF" value={round(a.efficiency_factor, 3)} />
          <Metric label="Decoupling" value={a.decoupling != null ? `${round(a.decoupling, 1)}%` : "—"} />
          <Metric label="Calories" value={a.calories != null ? `${Math.round(a.calories)}` : "—"} />
          <Metric label="Work" value={a.kj != null ? `${Math.round(a.kj)} kJ` : "—"} />
          <Metric label="Avg Cadence" value={a.avg_cadence != null ? `${Math.round(a.avg_cadence)}` : "—"} />
        </div>
      )}
    </div>
  );
}

function PeakPanel({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <section className="rounded border border-line bg-surface-card p-3">
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      <ul className="divide-y divide-line text-sm">
        {rows.map((r, i) => (
          <li key={i} className="flex justify-between py-1">
            <span className="text-ink-muted">{r.label}</span>
            <span className="tabular-nums text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
