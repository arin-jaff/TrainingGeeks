/**
 * Structured-workout document model. Pure and framework-agnostic: it is the
 * shared shape behind the builder UI, the calendar scheduler, the duration/TSS
 * estimator, and the Garmin FIT encoder. Nothing here touches the DB or React.
 *
 * A workout is an ordered list of steps. A step is either a single effort
 * (SimpleStep) or a repeat of a short list of efforts (RepeatBlock) — one level
 * of nesting, which covers "4×800 @ pace w/ jog" and the like. That maps
 * cleanly onto the FIT repeat-until-steps-complete loop.
 */

import type { Modality } from "../db/types.js";

export type StepIntensity =
  | "warmup"
  | "active"
  | "interval"
  | "recovery"
  | "rest"
  | "cooldown";

export const STEP_INTENSITIES: readonly StepIntensity[] = [
  "warmup",
  "active",
  "interval",
  "recovery",
  "rest",
  "cooldown",
];

/** How a step ends. time → seconds; distance → meters; lapButton → press lap. */
export type DurationKind = "time" | "distance" | "lapButton";

/**
 * What a step targets. Range values are stored in SI:
 *  - pace:    low/high in m/s (presented as pace for run/swim, speed for bike)
 *  - hr:      low/high in bpm
 *  - power:   low/high in watts
 *  - cadence: low/high in rpm (or strokes/min)
 *  - hrZone / powerZone: `low` holds the zone number (1..N); high ignored
 *  - none:    open, no target
 */
export type TargetKind =
  | "none"
  | "pace"
  | "hr"
  | "hrZone"
  | "power"
  | "powerZone"
  | "cadence";

export interface StepTarget {
  kind: TargetKind;
  low?: number | null;
  high?: number | null;
}

export interface SimpleStep {
  kind: "step";
  id: string;
  name?: string;
  intensity: StepIntensity;
  durationKind: DurationKind;
  /** seconds (time), meters (distance), or null/ignored (lapButton). */
  durationValue?: number | null;
  target: StepTarget;
  notes?: string;
}

export interface RepeatBlock {
  kind: "repeat";
  id: string;
  count: number;
  steps: SimpleStep[];
}

export type WorkoutStep = SimpleStep | RepeatBlock;

export interface WorkoutDoc {
  name: string;
  modality: Modality;
  description?: string;
  steps: WorkoutStep[];
}

export const MAX_REPEAT_COUNT = 99;
/** Garmin watches accept large workouts, but keep a sane ceiling on FIT steps. */
export const MAX_FLAT_STEPS = 100;

export function isRepeat(s: WorkoutStep): s is RepeatBlock {
  return s.kind === "repeat";
}

// ---- Flattening -------------------------------------------------------------

/**
 * One emitted FIT workout-step slot. Either a real effort, or a repeat marker
 * that loops back to `fromIndex` (the flat index of the first looped step).
 */
export type FlatEntry =
  | { type: "step"; step: SimpleStep }
  | { type: "repeat"; fromIndex: number; count: number };

/**
 * Resolve repeats into the linear step sequence a FIT file stores: each repeat
 * block's inner steps appear once, immediately followed by a repeat marker
 * whose loop-back index points at the first inner step. The array index of an
 * entry is its FIT `messageIndex`.
 */
export function flatten(steps: WorkoutStep[]): FlatEntry[] {
  const out: FlatEntry[] = [];
  for (const s of steps) {
    if (isRepeat(s)) {
      const fromIndex = out.length;
      for (const inner of s.steps) out.push({ type: "step", step: inner });
      // A repeat with no body or a count < 2 is a no-op; skip the marker.
      if (s.steps.length > 0 && s.count >= 2)
        out.push({ type: "repeat", fromIndex, count: s.count });
    } else {
      out.push({ type: "step", step: s });
    }
  }
  return out;
}

/** Number of FIT step messages this document encodes to (incl. repeat markers). */
export function flatStepCount(steps: WorkoutStep[]): number {
  return flatten(steps).length;
}

// ---- Validation -------------------------------------------------------------

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function validateTarget(t: StepTarget, where: string, errors: string[]): void {
  switch (t.kind) {
    case "none":
      return;
    case "hrZone":
    case "powerZone": {
      const z = t.low;
      if (z == null || !Number.isFinite(z) || z < 1 || z > 10)
        errors.push(`${where}: zone must be 1–10`);
      return;
    }
    default: {
      const lo = t.low;
      const hi = t.high;
      if (lo == null && hi == null) {
        errors.push(`${where}: target needs at least one bound`);
        return;
      }
      if (lo != null && hi != null && Number.isFinite(lo) && Number.isFinite(hi) && lo > hi)
        errors.push(`${where}: target low is above high`);
    }
  }
}

function validateSimple(s: SimpleStep, where: string, errors: string[]): void {
  if (s.durationKind === "time" || s.durationKind === "distance") {
    if (s.durationValue == null || !Number.isFinite(s.durationValue) || s.durationValue <= 0)
      errors.push(`${where}: ${s.durationKind} duration must be greater than zero`);
  }
  validateTarget(s.target, where, errors);
}

/** Validate a document for saving/exporting. Pure; returns a list of problems. */
export function validateWorkout(doc: WorkoutDoc): ValidationResult {
  const errors: string[] = [];
  if (!doc.name || !doc.name.trim()) errors.push("Name is required");
  if (!doc.steps || doc.steps.length === 0) errors.push("Add at least one step");

  doc.steps?.forEach((s, i) => {
    if (isRepeat(s)) {
      if (!Number.isInteger(s.count) || s.count < 2 || s.count > MAX_REPEAT_COUNT)
        errors.push(`Repeat ${i + 1}: count must be 2–${MAX_REPEAT_COUNT}`);
      if (!s.steps || s.steps.length === 0)
        errors.push(`Repeat ${i + 1}: add at least one step inside the repeat`);
      s.steps?.forEach((inner, j) =>
        validateSimple(inner, `Repeat ${i + 1} step ${j + 1}`, errors),
      );
    } else {
      validateSimple(s, `Step ${i + 1}`, errors);
    }
  });

  const flat = flatStepCount(doc.steps ?? []);
  if (flat > MAX_FLAT_STEPS)
    errors.push(`Too many steps (${flat}); the limit is ${MAX_FLAT_STEPS}`);

  return { ok: errors.length === 0, errors };
}
