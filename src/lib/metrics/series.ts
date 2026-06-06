/** Numeric time-series helpers used by the metrics engine. */

/**
 * Resample an irregular (time, value) series onto a uniform 1 Hz grid.
 * Samples are placed at round(time) seconds; gaps are forward-filled, and any
 * leading gap is back-filled from the first known value. Returns one value per
 * second from t=0 to the last sample.
 */
export function resampleTo1Hz(
  time: (number | null)[],
  value: (number | null)[],
): number[] {
  let maxT = 0;
  for (const t of time) if (t !== null && t > maxT) maxT = t;
  const len = Math.floor(maxT) + 1;
  if (len <= 0) return [];

  const grid: (number | null)[] = new Array(len).fill(null);
  for (let i = 0; i < time.length; i++) {
    const t = time[i];
    const v = value[i];
    if (t === null || !Number.isFinite(t)) continue;
    const idx = Math.round(t);
    if (idx >= 0 && idx < len && v !== null && Number.isFinite(v)) grid[idx] = v;
  }

  // Forward fill.
  let last = 0;
  let seenAny = false;
  for (let i = 0; i < len; i++) {
    if (grid[i] === null) {
      grid[i] = seenAny ? last : null;
    } else {
      last = grid[i] as number;
      seenAny = true;
    }
  }
  // Back fill any leading nulls.
  const firstKnown = grid.find((v) => v !== null) ?? 0;
  for (let i = 0; i < len; i++) if (grid[i] === null) grid[i] = firstKnown;

  return grid as number[];
}

/** Trailing moving average over a window of `w` samples (1 Hz => seconds). */
export function movingAverage(series: number[], w: number): number[] {
  if (w <= 1 || series.length === 0) return series.slice();
  const out = new Array<number>(series.length);
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i];
    if (i >= w) sum -= series[i - w];
    const count = Math.min(i + 1, w);
    out[i] = sum / count;
  }
  return out;
}

/**
 * "Normalized" value per the TrainingPeaks Normalized Power algorithm:
 * 30 s moving average, raised to the 4th power, averaged, 4th root. Works on
 * power (watts -> NP) or grade-adjusted speed (m/s -> NGP).
 */
export function normalizedValue(series1hz: number[], window = 30): number | null {
  if (series1hz.length < window) {
    // Too short for the rolling window; fall back to a plain mean.
    if (series1hz.length === 0) return null;
    const mean = series1hz.reduce((a, b) => a + b, 0) / series1hz.length;
    return mean || null;
  }
  const rolled = movingAverage(series1hz, window);
  let sum4 = 0;
  for (const v of rolled) sum4 += v ** 4;
  const mean4 = sum4 / rolled.length;
  return Math.pow(mean4, 0.25);
}

export function mean(series: (number | null)[]): number | null {
  let sum = 0;
  let n = 0;
  for (const v of series) {
    if (v !== null && Number.isFinite(v)) {
      sum += v;
      n++;
    }
  }
  return n === 0 ? null : sum / n;
}
