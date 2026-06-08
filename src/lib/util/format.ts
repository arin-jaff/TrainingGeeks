import type { Modality, Units } from "../db/types.js";

const M_PER_MI = 1609.34;
const M_PER_KM = 1000;

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDistance(
  meters: number | null | undefined,
  units: Units,
): string {
  if (meters == null || !Number.isFinite(meters)) return "—";
  const val = units === "imperial" ? meters / M_PER_MI : meters / M_PER_KM;
  const unit = units === "imperial" ? "mi" : "km";
  return `${val.toFixed(val >= 100 ? 0 : val >= 10 ? 1 : 2)} ${unit}`;
}

/** Pace from speed (m/s): run/bike per mi or km; swim per 100m. */
export function formatPace(
  speedMps: number | null | undefined,
  units: Units,
  modality: Modality,
): string {
  if (!speedMps || speedMps <= 0) return "—";
  if (modality === "swim") {
    const secPer100 = 100 / speedMps;
    return `${pad(secPer100)} /100m`;
  }
  const per = units === "imperial" ? M_PER_MI : M_PER_KM;
  const secPerUnit = per / speedMps;
  const label = units === "imperial" ? "/mi" : "/km";
  return `${pad(secPerUnit)} ${label}`;
}

function pad(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatStress(
  modality: Modality,
  tss: number | null,
  s3: number | null,
): { value: number; label: string } | null {
  if (modality === "lift" || modality === "core") {
    if (s3 == null) return null;
    return { value: Math.round(s3), label: "S³" };
  }
  if (tss == null) return null;
  return { value: Math.round(tss), label: "TSS" };
}

export function round(n: number | null | undefined, dp = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const f = 10 ** dp;
  return String(Math.round(n * f) / f);
}

export const MODALITY_LABEL: Record<Modality, string> = {
  run: "Run",
  bike: "Bike",
  swim: "Swim",
  row: "Rowing",
  lift: "Strength",
  core: "Core",
};
