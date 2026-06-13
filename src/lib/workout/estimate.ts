/**
 * Estimate duration / distance / training stress for a structured workout, so
 * the builder can preview load and the calendar can store planned_* values.
 * Pure: thresholds are passed in (resolved by the caller from the threshold
 * table for the scheduled date). Estimates are intentionally approximate.
 */

import type { Modality } from "../db/types.js";
import { isCardio } from "../db/types.js";
import {
  flatten,
  isRepeat,
  type SimpleStep,
  type StepIntensity,
  type WorkoutDoc,
  type WorkoutStep,
} from "./template.js";

export interface EstimateThresholds {
  /** Run/swim threshold pace as speed, m/s. */
  thresholdSpeed?: number | null;
  /** Cycling FTP, watts. */
  ftp?: number | null;
  /** Threshold (lactate) heart rate, bpm. */
  thresholdHr?: number | null;
}

export interface WorkoutEstimate {
  durationS: number | null;
  distanceM: number | null;
  tss: number | null;
}

/** Fallback intensity factor when a step has no explicit target. */
const INTENSITY_IF: Record<StepIntensity, number> = {
  warmup: 0.6,
  cooldown: 0.55,
  recovery: 0.55,
  rest: 0.4,
  active: 0.82,
  interval: 1.0,
};

/** Approximate IF for a zone number (1..5-ish), used by zone targets. */
const ZONE_IF = [0.5, 0.6, 0.75, 0.9, 1.02, 1.15, 1.25];

function mid(low?: number | null, high?: number | null): number | null {
  const a = low != null && Number.isFinite(low) ? low : null;
  const b = high != null && Number.isFinite(high) ? high : null;
  if (a != null && b != null) return (a + b) / 2;
  return a ?? b;
}

/**
 * IF for one step from its target, falling back to its intensity. Returns null
 * when nothing pins the intensity (e.g. open HR step with no thresholds).
 */
function stepIF(
  step: SimpleStep,
  modality: Modality,
  th: EstimateThresholds,
): number | null {
  const t = step.target;
  switch (t.kind) {
    case "pace": {
      const s = mid(t.low, t.high);
      if (s && th.thresholdSpeed) return s / th.thresholdSpeed;
      break;
    }
    case "power": {
      const w = mid(t.low, t.high);
      if (w && th.ftp) return w / th.ftp;
      break;
    }
    case "hr": {
      const h = mid(t.low, t.high);
      if (h && th.thresholdHr) return h / th.thresholdHr;
      break;
    }
    case "hrZone":
    case "powerZone": {
      const z = t.low;
      if (z != null && z >= 1 && z <= ZONE_IF.length) return ZONE_IF[z - 1];
      break;
    }
    case "cadence":
    case "none":
      break;
  }
  return INTENSITY_IF[step.intensity] ?? null;
}

/** Best-effort speed (m/s) for a step, for converting time↔distance. */
function stepSpeed(
  step: SimpleStep,
  modality: Modality,
  th: EstimateThresholds,
  ifv: number | null,
): number | null {
  if (step.target.kind === "pace") {
    const s = mid(step.target.low, step.target.high);
    if (s) return s;
  }
  if (th.thresholdSpeed && ifv) return th.thresholdSpeed * ifv;
  if (th.thresholdSpeed) return th.thresholdSpeed * (INTENSITY_IF[step.intensity] ?? 0.8);
  return null;
}

interface StepContribution {
  durationS: number;
  distanceM: number;
  tss: number;
}

function contribution(
  step: SimpleStep,
  modality: Modality,
  th: EstimateThresholds,
): StepContribution {
  const ifv = stepIF(step, modality, th);
  const speed = stepSpeed(step, modality, th, ifv);

  let durationS = 0;
  let distanceM = 0;
  if (step.durationKind === "time") {
    durationS = step.durationValue ?? 0;
    if (speed) distanceM = durationS * speed;
  } else if (step.durationKind === "distance") {
    distanceM = step.durationValue ?? 0;
    if (speed && speed > 0) durationS = distanceM / speed;
  }
  // lapButton: unknown duration → contributes nothing measurable.

  const tss = ifv && durationS > 0 ? (durationS / 3600) * ifv * ifv * 100 : 0;
  return { durationS, distanceM, tss };
}

/**
 * Estimate totals for a workout. Cardio gets duration/distance/TSS; strength
 * (lift/core) reports only the summed step duration (load there is S³, entered
 * per session, not derived from structure).
 */
export function estimateWorkout(
  doc: WorkoutDoc,
  th: EstimateThresholds = {},
): WorkoutEstimate {
  const cardio = isCardio(doc.modality);
  let durationS = 0;
  let distanceM = 0;
  let tss = 0;
  let sawDuration = false;
  let sawDistance = false;
  let sawTss = false;

  const add = (c: StepContribution, times: number) => {
    if (c.durationS > 0) {
      durationS += c.durationS * times;
      sawDuration = true;
    }
    if (c.distanceM > 0) {
      distanceM += c.distanceM * times;
      sawDistance = true;
    }
    if (c.tss > 0) {
      tss += c.tss * times;
      sawTss = true;
    }
  };

  for (const s of doc.steps) {
    if (isRepeat(s)) {
      for (const inner of s.steps) add(contribution(inner, doc.modality, th), s.count);
    } else {
      add(contribution(s as SimpleStep, doc.modality, th), 1);
    }
  }

  return {
    durationS: sawDuration ? Math.round(durationS) : null,
    distanceM: cardio && sawDistance ? Math.round(distanceM) : null,
    tss: cardio && sawTss ? Math.round(tss) : null,
  };
}

/** Convenience: flat step count used by the builder header. */
export function effortCount(steps: WorkoutStep[]): number {
  return flatten(steps).filter((e) => e.type === "step").length;
}

export interface ProfileSegment {
  intensity: StepIntensity;
  /** Estimated intensity factor (≈1.0 at threshold), for the bar height. */
  frac: number;
  /** Estimated seconds, for the bar width. */
  seconds: number;
}

/**
 * Expand a workout into one segment per executed step (repeats unrolled) for
 * the builder's intensity-profile graph — the bar shape an athlete recognizes.
 */
export function profileSegments(doc: WorkoutDoc, th: EstimateThresholds = {}): ProfileSegment[] {
  const segs: ProfileSegment[] = [];
  const push = (s: SimpleStep) => {
    const frac = stepIF(s, doc.modality, th) ?? INTENSITY_IF[s.intensity] ?? 0.6;
    const c = contribution(s, doc.modality, th);
    // Give open/lap steps a nominal width so they remain visible.
    const seconds = c.durationS > 0 ? c.durationS : 45;
    segs.push({ intensity: s.intensity, frac, seconds });
  };
  for (const s of doc.steps) {
    if (isRepeat(s)) {
      for (let i = 0; i < s.count; i++) for (const inner of s.steps) push(inner);
    } else {
      push(s as SimpleStep);
    }
  }
  return segs;
}
