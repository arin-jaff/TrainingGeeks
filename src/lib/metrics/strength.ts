/**
 * S³ — Strength Stress Score. Time × perceived effort, calibrated so a
 * default-effort hour scores like a moderate cardio hour.
 *
 *   S³ = duration_minutes × (M / 1.5)
 *   M  = 1.0 + RPE/10, clamped to [1.0, 2.0]   (RPE 5 -> 1.5, the default)
 *
 * At RPE 5 a 60 min session = 60 S³ (the "60 TSS = 1 hour, effort 5" anchor).
 */

export const DEFAULT_RPE = 5;

export function effortMultiplier(rpe: number): number {
  const r = Math.max(1, Math.min(10, rpe));
  return Math.max(1.0, Math.min(2.0, 1.0 + r / 10));
}

export function computeS3(durationS: number, rpe: number = DEFAULT_RPE): number {
  if (!Number.isFinite(durationS) || durationS <= 0) return 0;
  const minutes = durationS / 60;
  const s3 = minutes * (effortMultiplier(rpe) / 1.5);
  return Math.round(s3 * 10) / 10;
}
