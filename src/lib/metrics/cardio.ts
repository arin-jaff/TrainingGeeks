import type { NormalizedActivity } from "../fit/types.js";
import { isCardio } from "../db/types.js";
import { gradeAdjustedSpeed1Hz } from "./grade.js";
import { mean, normalizedValue, resampleTo1Hz } from "./series.js";

export interface CardioThresholds {
  ftp?: number | null; // watts (bike)
  thresholdSpeed?: number | null; // m/s (run/swim threshold pace)
  thresholdHr?: number | null; // bpm
}

export type TssMethod = "power" | "pace" | "hr" | null;

export interface CardioMetrics {
  np: number | null; // normalized power (W)
  ngp: number | null; // normalized graded pace as speed (m/s)
  intensityFactor: number | null;
  tss: number | null;
  tssMethod: TssMethod;
  variabilityIndex: number | null;
  efficiencyFactor: number | null;
  decoupling: number | null; // percent
  work: number | null; // kJ, integrated from the power stream
}

function round(v: number | null, dp: number): number | null {
  if (v === null || !Number.isFinite(v)) return null;
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

/** First-half vs second-half drift of (output / HR), as a percentage. */
function decoupling(output1hz: number[], hr1hz: number[]): number | null {
  const n = Math.min(output1hz.length, hr1hz.length);
  if (n < 120) return null; // need a meaningful steady block
  const mid = Math.floor(n / 2);
  const r1 = ratio(output1hz, hr1hz, 0, mid);
  const r2 = ratio(output1hz, hr1hz, mid, n);
  if (r1 === null || r2 === null || r1 === 0) return null;
  return ((r1 - r2) / r1) * 100;
}

function ratio(
  out: number[],
  hr: number[],
  lo: number,
  hi: number,
): number | null {
  const mo = mean(out.slice(lo, hi));
  const mh = mean(hr.slice(lo, hi));
  if (mo === null || mh === null || mh === 0) return null;
  return mo / mh;
}

/**
 * Compute power/pace/HR-based metrics for a cardio activity. Strength
 * modalities (lift/core) return all-null here; their load is S³ (M4).
 *
 * TSS reduces to (duration/3600) * IF^2 * 100 for every method, where IF is
 * NP/FTP (power), NGP/thresholdSpeed (pace), or avgHR/thresholdHR (hr).
 */
export function computeCardioMetrics(
  activity: NormalizedActivity,
  thresholds: CardioThresholds,
): CardioMetrics {
  const empty: CardioMetrics = {
    np: null,
    ngp: null,
    intensityFactor: null,
    tss: null,
    tssMethod: null,
    variabilityIndex: null,
    efficiencyFactor: null,
    decoupling: null,
    work: null,
  };
  if (!isCardio(activity.modality)) return empty;

  const { channels, summary, modality } = activity;
  const power1hz = resampleTo1Hz(channels.time, channels.power);
  const speed1hz = resampleTo1Hz(channels.time, channels.speed);
  const alt1hz = resampleTo1Hz(channels.time, channels.alt);
  const dist1hz = resampleTo1Hz(channels.time, channels.distance);
  const hr1hz = resampleTo1Hz(channels.time, channels.hr);

  const hasPower = power1hz.some((v) => v > 0);
  const hasSpeed = speed1hz.some((v) => v > 0);
  const durationS = summary.durationS ?? (power1hz.length || speed1hz.length);

  // Normalized Power.
  const np = hasPower ? normalizedValue(power1hz) : null;
  const avgPower = summary.avgPower ?? mean(power1hz);
  const vi = np && avgPower ? np / avgPower : null;

  // Normalized Graded Pace (run/swim): grade-adjusted speed, normalized.
  let ngp: number | null = null;
  if ((modality === "run" || modality === "swim") && hasSpeed) {
    const gas =
      modality === "run"
        ? gradeAdjustedSpeed1Hz(speed1hz, alt1hz, dist1hz)
        : speed1hz;
    ngp = normalizedValue(gas);
  }

  const avgHr = summary.avgHr ?? mean(hr1hz);

  // Choose IF / TSS method by modality, preferring power(bike) / pace(run,swim).
  let intensityFactor: number | null = null;
  let tssMethod: TssMethod = null;
  if (modality === "bike" && np && thresholds.ftp) {
    intensityFactor = np / thresholds.ftp;
    tssMethod = "power";
  } else if (
    (modality === "run" || modality === "swim") &&
    ngp &&
    thresholds.thresholdSpeed
  ) {
    intensityFactor = ngp / thresholds.thresholdSpeed;
    tssMethod = "pace";
  } else if (avgHr && thresholds.thresholdHr) {
    intensityFactor = avgHr / thresholds.thresholdHr;
    tssMethod = "hr";
  }

  const tss =
    intensityFactor !== null
      ? (durationS / 3600) * intensityFactor ** 2 * 100
      : null;

  // Efficiency factor: normalized output over HR.
  const output = modality === "bike" ? np : ngp;
  const ef = output && avgHr ? output / avgHr : null;

  // Decoupling: power for bike, grade-adjusted speed for run.
  const decoupleOut = modality === "bike" ? power1hz : speed1hz;
  const decouple =
    (hasPower || hasSpeed) && hr1hz.some((v) => v > 0)
      ? decoupling(decoupleOut, hr1hz)
      : null;

  return {
    np: round(np, 0),
    ngp: round(ngp, 4),
    intensityFactor: round(intensityFactor, 3),
    tss: round(tss, 1),
    tssMethod,
    variabilityIndex: round(vi, 3),
    efficiencyFactor: round(ef, 4),
    decoupling: round(decouple, 1),
    // Work = integral of power over time; 1 Hz samples => Σ watts / 1000 kJ.
    work: hasPower
      ? Math.round(power1hz.reduce((a, b) => a + b, 0) / 1000)
      : null,
  };
}
