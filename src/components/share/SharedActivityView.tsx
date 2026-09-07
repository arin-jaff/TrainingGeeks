"use client";

import dynamic from "next/dynamic";
import type { SharedActivity } from "@/lib/queries/share";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  round,
  MODALITY_LABEL,
} from "@/lib/util/format";
import { MODALITY_COLOR } from "@/lib/util/colors";
import Splits from "@/components/activity/Splits";
import type { StreamSeries } from "@/components/activity/StreamChart";

const StreamChart = dynamic(() => import("@/components/activity/StreamChart"), { ssr: false });
const RouteMap = dynamic(() => import("@/components/activity/RouteMap"), { ssr: false });

function longDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Read-only presentation of ONE shared activity. It renders exactly the
 * fields on `SharedActivity` (see the allow-list in lib/queries/share.ts) —
 * there is no athlete, no private notes, and no link to any other activity.
 */
export default function SharedActivityView({ shared }: { shared: SharedActivity }) {
  const s = shared;
  const units = s.units;
  const modality = s.modality;
  const isStrength = modality === "lift" || modality === "core";
  const stress = isStrength ? s.s3 : s.tss;
  const stressLabel = isStrength ? "S³" : "TSS";
  const num = (v: number | null, suffix = "") => (v == null ? "—" : `${Math.round(v)}${suffix}`);

  const series: StreamSeries[] = [];
  if (s.stream) {
    const st = s.stream;
    if (st.alt.some((v) => v !== null))
      series.push({ label: "Elevation (m)", data: st.alt, color: "#9ca3af", scale: "alt", fill: "rgba(156,163,175,0.18)" });
    if (st.hr.some((v) => v !== null))
      series.push({ label: "HR (bpm)", data: st.hr, color: "#e63788", scale: "hr" });
    if (st.power.some((v) => v !== null))
      series.push({ label: "Power (W)", data: st.power, color: "#7b2d8e", scale: "pwr" });
    if (st.speed.some((v) => v !== null))
      series.push({ label: "Speed (m/s)", data: st.speed, color: "#45ae01", scale: "spd" });
  }

  const metrics: { label: string; value: string; unit: string }[] = [
    { label: "Duration", value: formatDuration(s.durationS), unit: "h:m:s" },
    { label: "Distance", value: formatDistance(s.distanceM, units).split(" ")[0], unit: units === "imperial" ? "mi" : "km" },
    modality === "bike"
      ? { label: "Average Speed", value: formatSpeed(s.avgSpeedMps, units).split(" ")[0], unit: units === "imperial" ? "mph" : "km/h" }
      : { label: "Average Pace", value: formatPace(s.avgSpeedMps, units, modality).split(" ")[0], unit: modality === "swim" ? "/100m" : units === "imperial" ? "min/mi" : "min/km" },
    { label: "Calories", value: num(s.calories), unit: "kcal" },
    {
      label: "Elevation Gain",
      value: s.elevationGainM == null ? "—" : String(Math.round(s.elevationGainM * (units === "imperial" ? 3.28084 : 1))),
      unit: units === "imperial" ? "ft" : "m",
    },
    { label: stressLabel, value: num(stress), unit: stressLabel },
    { label: "IF", value: round(s.intensityFactor, 2), unit: "IF" },
    { label: "Work", value: num(s.kj), unit: "kJ" },
  ];
  if (s.np != null) metrics.push({ label: "Normalized Power", value: num(s.np), unit: "W" });
  if (s.avgCadence != null)
    metrics.push({ label: "Avg Cadence", value: num(s.avgCadence), unit: modality === "bike" ? "rpm" : "spm" });

  const mam = [
    modality === "bike"
      ? {
          label: "Speed",
          min: formatSpeed(s.minSpeed, units).split(" ")[0],
          avg: formatSpeed(s.avgSpeedMps, units).split(" ")[0],
          max: formatSpeed(s.maxSpeed, units).split(" ")[0],
        }
      : {
          label: "Pace",
          min: formatPace(s.minSpeed, units, modality).split(" ")[0],
          avg: formatPace(s.avgSpeedMps, units, modality).split(" ")[0],
          max: formatPace(s.maxSpeed, units, modality).split(" ")[0],
        },
    { label: "Heart Rate", min: num(s.minHr), avg: num(s.avgHr), max: num(s.maxHr) },
  ];
  if (s.avgPower != null || s.maxPower != null) {
    mam.push({ label: "Power", min: "—", avg: num(s.avgPower), max: num(s.maxPower) });
  }

  return (
    <div>
      <div className="mb-4 border-b border-line pb-3">
        <div className="mb-1 text-sm font-medium uppercase tracking-wide text-ink-muted">
          {longDate(s.localDate)}
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: MODALITY_COLOR[modality] }}
              aria-hidden
            />
            <h1 className="text-xl font-semibold text-ink">
              {s.name ?? MODALITY_LABEL[modality]}
            </h1>
          </div>
          <div className="flex gap-4 text-sm text-ink">
            <span className="font-semibold">{formatDuration(s.durationS)}</span>
            <span className="font-semibold">{formatDistance(s.distanceM, units)}</span>
            {stress != null && (
              <span className="font-semibold">
                {Math.round(stress)} {stressLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {s.hasGps && s.stream && (
        <div className="mb-4">
          <RouteMap lat={s.stream.lat} lng={s.stream.lng} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <table className="w-full text-[13px]">
            <tbody>
              {metrics.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <td className="w-1/2 py-1 text-ink">{r.label}</td>
                  <td className="px-2 py-1 text-right font-medium tabular-nums text-ink">
                    {r.value}
                  </td>
                  <td className="pl-1 text-[11px] text-ink-muted">{r.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>

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
              {mam.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <td className="py-1 text-ink">{r.label}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-ink">{r.min}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-ink">{r.avg}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-ink">{r.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-sm text-ink-muted">
          <h2 className="mb-1 font-semibold text-ink">Description</h2>
          <p className="whitespace-pre-line">{s.description || "No description."}</p>
        </div>
      </div>

      {series.length > 0 && s.stream && (
        <div className="mt-4 rounded border border-line bg-surface-card p-3">
          <StreamChart time={s.stream.time} series={series} />
        </div>
      )}

      {!isStrength && (s.laps.length > 1 || s.autoSplits.length > 0) && (
        <div className="mt-4">
          <Splits
            laps={s.laps}
            autoSplits={s.autoSplits}
            splitUnitLabel={s.splitUnitLabel}
            modality={modality}
            units={units}
            hrZoneAnchor={s.hrZoneAnchor}
          />
        </div>
      )}
    </div>
  );
}
