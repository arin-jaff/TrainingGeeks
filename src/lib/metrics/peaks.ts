import { resampleTo1Hz } from "./series.js";
import type { StreamChannels } from "../fit/types.js";

export const PEAK_DURATIONS_S = [
  1, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 2700, 3600, 5400,
];

// Common running/cycling distances in meters (incl. mile, 5k, 10k, HM).
export const PEAK_DISTANCES_M = [
  100, 200, 400, 800, 1000, 1609.34, 3000, 5000, 10000, 16093.4, 21097.5,
];

export interface DurationPeak {
  window: number; // seconds
  value: number; // best rolling average (watts or bpm)
  startOffsetS: number;
}

export interface DistancePeak {
  window: number; // meters
  speed: number; // m/s over the fastest segment
  timeS: number; // seconds to cover the distance
  startOffsetS: number;
}

/**
 * Best rolling-average value for each duration window using a 1 Hz series and
 * a sliding sum. Used for peak power and peak HR.
 */
export function durationPeaks(
  series1hz: number[],
  windows: number[] = PEAK_DURATIONS_S,
): DurationPeak[] {
  const n = series1hz.length;
  const out: DurationPeak[] = [];
  for (const w of windows) {
    if (w > n) continue;
    let sum = 0;
    for (let i = 0; i < w; i++) sum += series1hz[i];
    let best = sum;
    let bestStart = 0;
    for (let i = w; i < n; i++) {
      sum += series1hz[i] - series1hz[i - w];
      if (sum > best) {
        best = sum;
        bestStart = i - w + 1;
      }
    }
    out.push({ window: w, value: best / w, startOffsetS: bestStart });
  }
  return out;
}

/**
 * Fastest time to cover each target distance, using cumulative distance/time
 * from the raw records (monotonic distance) and a two-pointer sweep.
 */
export function distancePeaks(
  time: (number | null)[],
  distance: (number | null)[],
  windows: number[] = PEAK_DISTANCES_M,
): DistancePeak[] {
  // Compact to finite, monotonically increasing (t, d) points.
  const pts: { t: number; d: number }[] = [];
  for (let i = 0; i < time.length; i++) {
    const t = time[i];
    const d = distance[i];
    if (t === null || d === null || !Number.isFinite(t) || !Number.isFinite(d))
      continue;
    if (pts.length && d < pts[pts.length - 1].d) continue; // ignore regressions
    pts.push({ t, d });
  }
  const totalDist = pts.length ? pts[pts.length - 1].d : 0;

  const out: DistancePeak[] = [];
  for (const w of windows) {
    if (w > totalDist) continue;
    let best = Infinity;
    let bestStart = 0;
    let lo = 0;
    for (let hi = 0; hi < pts.length; hi++) {
      while (pts[hi].d - pts[lo].d >= w) {
        const dt = pts[hi].t - pts[lo].t;
        if (dt > 0 && dt < best) {
          best = dt;
          bestStart = pts[lo].t;
        }
        lo++;
      }
    }
    if (Number.isFinite(best) && best > 0) {
      out.push({
        window: w,
        speed: w / best,
        timeS: best,
        startOffsetS: bestStart,
      });
    }
  }
  return out;
}

/** Compute all peak curves for an activity from its stream channels. */
export function computePeaks(channels: StreamChannels) {
  const power1hz = resampleTo1Hz(channels.time, channels.power);
  const hr1hz = resampleTo1Hz(channels.time, channels.hr);
  return {
    power: power1hz.some((v) => v > 0)
      ? durationPeaks(power1hz)
      : [],
    hr: hr1hz.some((v) => v > 0) ? durationPeaks(hr1hz) : [],
    pace: distancePeaks(channels.time, channels.distance),
  };
}
