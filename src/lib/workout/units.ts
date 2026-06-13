/**
 * Parsing/formatting helpers shared by the workout builder UI. Pure string↔SI
 * conversions: durations in seconds, distances in meters, paces as speed (m/s).
 */

import type { Modality, Units } from "../db/types.js";

export const M_PER_MI = 1609.34;
export const M_PER_KM = 1000;
export const M_PER_YD = 0.9144;

export type DistanceUnit = "m" | "km" | "mi" | "yd";

export function distanceUnitMeters(u: DistanceUnit): number {
  switch (u) {
    case "m":
      return 1;
    case "km":
      return M_PER_KM;
    case "mi":
      return M_PER_MI;
    case "yd":
      return M_PER_YD;
  }
}

/** Default distance unit for entering a step: short intervals read in metres. */
export function defaultDistanceUnit(units: Units, modality: Modality): DistanceUnit {
  if (modality === "swim") return "m";
  return units === "imperial" ? "mi" : "km";
}

/** "1:05:36" → 3936s, "48:11" → 2891s, "30" → 1800s (bare number = minutes). */
export function parseDuration(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (!t.includes(":")) {
    const m = Number(t);
    return Number.isFinite(m) ? Math.round(m * 60) : null;
  }
  const parts = t.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return Math.round(sec);
}

export function fmtDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "";
  const t = Math.round(sec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Pace string ("5:30") + unit → speed m/s. Swim pace is per 100m. */
export function paceToSpeed(s: string, modality: Modality, units: Units): number | null {
  const t = s.trim();
  if (!t || !t.includes(":")) return null;
  const [m, sec] = t.split(":").map((p) => Number(p));
  if (!Number.isFinite(m) || !Number.isFinite(sec)) return null;
  const perSec = m * 60 + sec;
  if (perSec <= 0) return null;
  const unit = modality === "swim" ? 100 : units === "imperial" ? M_PER_MI : M_PER_KM;
  return unit / perSec;
}

export function speedToPace(speed: number | null | undefined, modality: Modality, units: Units): string {
  if (!speed || speed <= 0) return "";
  const unit = modality === "swim" ? 100 : units === "imperial" ? M_PER_MI : M_PER_KM;
  const total = Math.round(unit / speed);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function paceUnitLabel(modality: Modality, units: Units): string {
  if (modality === "swim") return "/100m";
  return units === "imperial" ? "/mi" : "/km";
}

export const numOrNull = (s: string): number | null => {
  const n = Number(s.trim());
  return s.trim() !== "" && Number.isFinite(n) ? n : null;
};
