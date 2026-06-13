/**
 * Render a structured workout to a compact one-line summary, e.g.
 *   "Warm up 10:00 / 4× (800 m @ 3:45/mi + 2:00 jog) / Cool down 10:00"
 * Used for the calendar card subtitle and a sensible default description.
 * Pure; needs units + modality to format pace/distance the way the athlete reads.
 */

import type { Modality, Units } from "../db/types.js";
import { formatDuration } from "../util/format.js";
import {
  isRepeat,
  type SimpleStep,
  type StepIntensity,
  type WorkoutStep,
} from "./template.js";

const M_PER_MI = 1609.34;

const PREFIX: Partial<Record<StepIntensity, string>> = {
  warmup: "Warm up",
  cooldown: "Cool down",
  recovery: "Recover",
  rest: "Rest",
};

function mid(low?: number | null, high?: number | null): number | null {
  const a = low != null && Number.isFinite(low) ? low : null;
  const b = high != null && Number.isFinite(high) ? high : null;
  if (a != null && b != null) return (a + b) / 2;
  return a ?? b;
}

function paceFromSpeed(speedMps: number, units: Units, modality: Modality): string {
  if (speedMps <= 0) return "";
  if (modality === "swim") {
    return `${clock(100 / speedMps)}/100m`;
  }
  const per = units === "imperial" ? M_PER_MI : 1000;
  const label = units === "imperial" ? "/mi" : "/km";
  return `${clock(per / speedMps)}${label}`;
}

function clock(totalSeconds: number): string {
  const t = Math.round(totalSeconds);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Distance the way intervals read: metres under 1 km, else mi/km by units. */
export function workoutDistance(m: number, units: Units): string {
  if (m < 1000) return `${Math.round(m)} m`;
  if (units === "imperial") return `${(m / M_PER_MI).toFixed(2)} mi`;
  return `${(m / 1000).toFixed(2)} km`;
}

function durationLabel(step: SimpleStep, units: Units): string {
  if (step.durationKind === "time") return formatDuration(step.durationValue ?? 0);
  if (step.durationKind === "distance") return workoutDistance(step.durationValue ?? 0, units);
  return "lap";
}

function targetLabel(step: SimpleStep, units: Units, modality: Modality): string {
  const t = step.target;
  switch (t.kind) {
    case "pace": {
      const s = mid(t.low, t.high);
      return s ? paceFromSpeed(s, units, modality) : "";
    }
    case "power": {
      const w = mid(t.low, t.high);
      return w ? `${Math.round(w)} W` : "";
    }
    case "hr": {
      const h = mid(t.low, t.high);
      return h ? `${Math.round(h)} bpm` : "";
    }
    case "cadence": {
      const c = mid(t.low, t.high);
      return c ? `${Math.round(c)} rpm` : "";
    }
    case "hrZone":
      return t.low ? `Z${t.low} HR` : "";
    case "powerZone":
      return t.low ? `Z${t.low} pwr` : "";
    case "none":
      return "";
  }
}

function simple(step: SimpleStep, units: Units, modality: Modality): string {
  const prefix = PREFIX[step.intensity];
  const dur = durationLabel(step, units);
  const tgt = targetLabel(step, units, modality);
  const head = prefix ? `${prefix} ${dur}` : dur;
  return tgt ? `${head} @ ${tgt}` : head;
}

export function summarizeWorkout(
  steps: WorkoutStep[],
  units: Units,
  modality: Modality,
): string {
  const parts = steps.map((s) => {
    if (isRepeat(s)) {
      const inner = s.steps.map((i) => simple(i, units, modality)).join(" + ");
      return `${s.count}× (${inner})`;
    }
    return simple(s, units, modality);
  });
  return parts.join(" / ");
}
