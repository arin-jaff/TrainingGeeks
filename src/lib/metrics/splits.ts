/**
 * Even distance splits (1 mi / 1 km / 100 m) computed from a recorded stream,
 * for activities whose device laps don't line up with distance markers. Pure:
 * takes the columnar channels and a split length in metres. The `distance`
 * channel is cumulative metres from the start.
 */

export interface SplitChannels {
  time: (number | null)[]; // seconds from start
  distance: (number | null)[]; // cumulative metres
  hr: (number | null)[];
  power: (number | null)[];
  speed: (number | null)[];
}

export interface Split {
  /** Metres covered in this split (≈ unit, less for the final partial split). */
  distanceM: number;
  durationS: number;
  avgSpeedMps: number | null;
  avgHr: number | null;
  avgPower: number | null;
}

function mean(sum: number, n: number): number | null {
  return n > 0 ? sum / n : null;
}

/**
 * Build splits of `unitMeters` each. Walks the samples once, closing a split
 * when cumulative distance crosses the next boundary. Averages HR/power over
 * the samples inside each split; pace comes from split distance ÷ elapsed.
 */
export function computeSplits(ch: SplitChannels, unitMeters: number): Split[] {
  if (!(unitMeters > 0)) return [];
  const n = Math.min(ch.time.length, ch.distance.length);
  if (n < 2) return [];

  const splits: Split[] = [];
  let boundary = unitMeters; // next cumulative distance that closes a split
  let startDist = 0;
  let startTime: number | null = null;
  let hrSum = 0,
    hrN = 0,
    pwSum = 0,
    pwN = 0;
  let lastDist = 0;
  let lastTime = 0;

  const accumulate = (i: number) => {
    const h = ch.hr[i];
    if (h != null && h > 0) {
      hrSum += h;
      hrN++;
    }
    const p = ch.power[i];
    if (p != null && p >= 0) {
      pwSum += p;
      pwN++;
    }
  };

  const closeSplit = (endDist: number, endTime: number) => {
    const dist = endDist - startDist;
    const dur = startTime == null ? 0 : endTime - startTime;
    splits.push({
      distanceM: dist,
      durationS: dur,
      avgSpeedMps: dur > 0 ? dist / dur : null,
      avgHr: mean(hrSum, hrN),
      avgPower: mean(pwSum, pwN),
    });
    hrSum = 0;
    hrN = 0;
    pwSum = 0;
    pwN = 0;
    startDist = endDist;
    startTime = endTime;
  };

  for (let i = 0; i < n; i++) {
    const d = ch.distance[i];
    const t = ch.time[i];
    if (d == null || t == null) continue;
    if (startTime == null) startTime = t;
    accumulate(i);
    lastDist = d;
    lastTime = t;
    // A single long sample can cross several boundaries; close each one.
    while (d >= boundary) {
      closeSplit(boundary, t);
      boundary += unitMeters;
    }
  }

  // Trailing partial split (anything past the last boundary worth showing).
  if (lastDist - startDist > unitMeters * 0.05) {
    closeSplit(lastDist, lastTime);
  }

  return splits;
}
