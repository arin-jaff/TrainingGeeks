"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ActivityDetail } from "@/lib/queries/activity";
import type { Modality, Units } from "@/lib/db/types";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  round,
} from "@/lib/util/format";
import type { StreamSeries } from "./StreamChart";
import Splits from "./Splits";

const StreamChart = dynamic(() => import("./StreamChart"), { ssr: false });
const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false });

const MEDAL_SRC = ["/medal-gold.png", "/medal-silver.png", "/medal-bronze.png"];

function distanceLabel(m: number): string {
  if (Math.abs(m - 1609.34) < 1) return "1 mi";
  if (Math.abs(m - 16093.4) < 5) return "10 mi";
  if (Math.abs(m - 21097.5) < 5) return "Half";
  if (m >= 1000) return `${m / 1000} km`;
  return `${m} m`;
}

function MetricTable({
  rows,
}: {
  rows: { label: string; completed: string; unit: string }[];
}) {
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="text-ink-muted">
          <th className="w-1/2" />
          <th className="px-2 py-1 text-right font-medium">Planned</th>
          <th className="px-2 py-1 text-right font-medium">Completed</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-line">
            <td className="py-1 text-ink">{r.label}</td>
            <td className="bg-surface px-2 py-1 text-right text-ink-muted">—</td>
            <td className="px-2 py-1 text-right font-medium tabular-nums text-ink">
              {r.completed}
            </td>
            <td className="pl-1 text-[11px] text-ink-muted">{r.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MinAvgMax({
  rows,
}: {
  rows: { label: string; min: string; avg: string; max: string }[];
}) {
  return (
    <table className="mt-3 w-full text-[13px]">
      <thead>
        <tr className="text-ink-muted">
          <th className="w-1/3" />
          <th className="px-2 py-1 text-right font-medium">Min</th>
          <th className="px-2 py-1 text-right font-medium">Avg</th>
          <th className="px-2 py-1 text-right font-medium">Max</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-line">
            <td className="py-1 text-ink">{r.label}</td>
            <td className="px-2 py-1 text-right tabular-nums text-ink">{r.min}</td>
            <td className="px-2 py-1 text-right tabular-nums text-ink">{r.avg}</td>
            <td className="px-2 py-1 text-right tabular-nums text-ink">{r.max}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AnalyzeView({
  detail,
  units,
  images = [],
  tonnageKg = null,
}: {
  detail: ActivityDetail;
  units: Units;
  images?: { id: number; filename: string }[];
  tonnageKg?: number | null;
}) {
  const [tab, setTab] = useState<"summary" | "analyze">("summary");
  const a = detail.activity;
  const modality = a.modality as Modality;
  const s = detail.stream;
  const isStrength = modality === "lift" || modality === "core";

  const series: StreamSeries[] = [];
  if (s) {
    if (s.alt.some((v) => v !== null))
      series.push({ label: "Elevation (m)", data: s.alt, color: "#9ca3af", scale: "alt", fill: "rgba(156,163,175,0.18)" });
    if (s.hr.some((v) => v !== null))
      series.push({ label: "HR (bpm)", data: s.hr, color: "#e63788", scale: "hr" });
    if (s.power.some((v) => v !== null))
      series.push({ label: "Power (W)", data: s.power, color: "#7b2d8e", scale: "pwr" });
    if (s.speed.some((v) => v !== null))
      series.push({ label: "Speed (m/s)", data: s.speed, color: "#45ae01", scale: "spd" });
  }

  const num = (v: number | null, suffix = "") =>
    v == null ? "—" : `${Math.round(v)}${suffix}`;
  const cadenceUnit = modality === "bike" ? "rpm" : "spm";
  type MetricRow = { label: string; completed: string; unit: string };
  const metricRows: MetricRow[] = [
    { label: "Duration", completed: formatDuration(a.duration_s), unit: "h:m:s" },
    { label: "Distance", completed: formatDistance(a.distance_m, units).split(" ")[0], unit: units === "imperial" ? "mi" : "km" },
    modality === "bike"
      ? { label: "Average Speed", completed: formatSpeed(a.avg_speed_mps, units).split(" ")[0], unit: units === "imperial" ? "mph" : "km/h" }
      : { label: "Average Pace", completed: formatPace(a.avg_speed_mps, units, modality).split(" ")[0], unit: modality === "swim" ? "/100m" : units === "imperial" ? "min/mi" : "min/km" },
    { label: "Calories", completed: num(a.calories), unit: "kcal" },
    { label: "Elevation Gain", completed: a.elevation_gain_m == null ? "—" : String(Math.round(a.elevation_gain_m * (units === "imperial" ? 3.28084 : 1))), unit: units === "imperial" ? "ft" : "m" },
    { label: isStrength ? "S³" : "TSS", completed: num(isStrength ? a.s3 : a.tss), unit: isStrength ? "S³" : "rTSS" },
    { label: "IF", completed: round(a.intensity_factor, 2), unit: "IF" },
    { label: "Work", completed: num(a.kj), unit: "kJ" },
  ];
  // Additional metrics shown only when the activity actually has the data.
  if (a.np != null) metricRows.push({ label: "Normalized Power", completed: num(a.np), unit: "W" });
  if (a.variability_index != null) metricRows.push({ label: "Variability Index", completed: round(a.variability_index, 2), unit: "VI" });
  if (a.efficiency_factor != null) metricRows.push({ label: "Efficiency Factor", completed: round(a.efficiency_factor, 2), unit: "EF" });
  if (a.decoupling != null) metricRows.push({ label: "Decoupling", completed: a.decoupling.toFixed(1), unit: "%" });
  if (a.avg_cadence != null) metricRows.push({ label: "Avg Cadence", completed: num(a.avg_cadence), unit: cadenceUnit });
  if (a.max_cadence != null) metricRows.push({ label: "Max Cadence", completed: num(a.max_cadence), unit: cadenceUnit });
  if (isStrength && tonnageKg != null && tonnageKg > 0) {
    const t = units === "imperial" ? tonnageKg / 0.453592 : tonnageKg;
    metricRows.push({ label: "Tonnage", completed: String(Math.round(t)), unit: units === "imperial" ? "lb" : "kg" });
  }

  // Min over the moving stream (ignore standing/zero samples).
  const minOf = (xs: (number | null)[] | undefined) => {
    if (!xs) return null;
    let m: number | null = null;
    for (const v of xs) {
      if (v == null || v <= 0) continue;
      m = m == null ? v : Math.min(m, v);
    }
    return m;
  };

  const mamRows = [
    // Cyclists read speed; runners and swimmers read pace. Note min/max swap:
    // the slowest moving speed is the fastest (largest) pace and vice versa.
    modality === "bike"
      ? {
          label: "Speed",
          min: formatSpeed(detail.minSpeed, units).split(" ")[0],
          avg: formatSpeed(a.avg_speed_mps, units).split(" ")[0],
          max: formatSpeed(detail.maxSpeed, units).split(" ")[0],
        }
      : {
          label: "Pace",
          min: formatPace(detail.minSpeed, units, modality).split(" ")[0],
          avg: formatPace(a.avg_speed_mps, units, modality).split(" ")[0],
          max: formatPace(detail.maxSpeed, units, modality).split(" ")[0],
        },
    {
      label: "Heart Rate",
      min: num(detail.minHr),
      avg: num(a.avg_hr),
      max: num(a.max_hr),
    },
  ];
  if (a.avg_power != null || a.max_power != null) {
    mamRows.push({
      label: "Power",
      min: num(minOf(s?.power)),
      avg: num(a.avg_power),
      max: num(a.max_power),
    });
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["summary", "analyze"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "rounded px-3 py-1 text-sm font-medium capitalize",
              tab === t
                ? "bg-accent text-white"
                : "border border-accent/50 text-accent hover:bg-accent/5",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            {detail.pacePeaks.length > 0 && (
              <section className="mb-5">
                <h3 className="mb-2 text-center text-sm font-semibold text-ink">
                  Peak Performances
                </h3>
                <ul className="space-y-1.5">
                  {detail.pacePeaks.slice(0, 5).map((p, i) => (
                    <li key={p.window} className="flex items-center gap-3 text-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={MEDAL_SRC[i % 3]} alt="" className="h-5 w-5 object-contain" />
                      <span className="w-16 font-semibold tabular-nums text-ink">
                        {formatDuration(p.window / p.speed)}
                      </span>
                      <span className="text-ink-muted">{distanceLabel(p.window)}</span>
                      <span className="ml-auto text-xs text-ink-muted">
                        {formatPace(p.speed, units, modality)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <MetricTable rows={metricRows} />
            <MinAvgMax rows={mamRows} />
          </div>
          <div className="text-sm text-ink-muted">
            <h3 className="mb-1 font-semibold text-ink">Description</h3>
            <p className="mb-4 whitespace-pre-line">{a.notes || "No description."}</p>

            <h3 className="mb-1 font-semibold text-ink">Private Notes</h3>
            <p className="mb-4 whitespace-pre-line">
              {a.private_notes || "No private notes."}
            </p>

            <h3 className="mb-1 font-semibold text-ink">
              Rating of Perceived Exertion (RPE)
            </h3>
            <p>{a.rpe == null ? "—" : `${a.rpe} / 10`}</p>

            {images.length > 0 && (
              <>
                <h3 className="mb-2 mt-4 font-semibold text-ink">Images</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {images.map((img) => (
                    <a
                      key={img.id}
                      href={`/api/activity-file/${img.id}`}
                      target="_blank"
                      rel="noreferrer"
                      title={img.filename}
                      className="block overflow-hidden rounded border border-line hover:border-accent"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/activity-file/${img.id}`}
                        alt={img.filename}
                        className="aspect-square w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {detail.hasGps && s && <RouteMap lat={s.lat} lng={s.lng} />}
          {series.length > 0 && s && (
            <div className="rounded border border-line bg-surface-card p-3">
              <StreamChart time={s.time} series={series} />
            </div>
          )}
          {!isStrength && (detail.laps.length > 1 || detail.autoSplits.length > 0) && (
            <Splits
              laps={detail.laps}
              autoSplits={detail.autoSplits}
              splitUnitLabel={detail.splitUnitLabel}
              modality={modality}
              units={units}
              hrZoneAnchor={detail.hrZoneAnchor}
            />
          )}
        </div>
      )}
    </div>
  );
}
