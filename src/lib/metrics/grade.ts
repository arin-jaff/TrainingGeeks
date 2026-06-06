/**
 * Grade-adjusted speed for running, used to derive Normalized Graded Pace.
 *
 * Uses Minetti's energy-cost-of-running polynomial (J/kg/m) as a function of
 * gradient i (rise/run). The grade factor is cost(i)/cost(0); grade-adjusted
 * speed = speed * factor (running uphill at speed v is "worth" a faster flat
 * speed). This is the simpler V1 model noted in PLAN §13 and can be refined.
 */

function minettiCost(i: number): number {
  const g = Math.max(-0.45, Math.min(0.45, i));
  return (
    155.4 * g ** 5 -
    30.4 * g ** 4 -
    43.3 * g ** 3 +
    46.3 * g ** 2 +
    19.5 * g +
    3.6
  );
}

const FLAT_COST = minettiCost(0);

export function gradeFactor(gradient: number): number {
  if (!Number.isFinite(gradient)) return 1;
  return minettiCost(gradient) / FLAT_COST;
}

/**
 * Build a grade-adjusted speed series (m/s) from 1 Hz speed, altitude and
 * cumulative distance. Gradient is computed from altitude change over distance
 * change between consecutive seconds, lightly smoothed by the caller's inputs.
 */
export function gradeAdjustedSpeed1Hz(
  speed: number[],
  altitude: number[],
  distance: number[],
): number[] {
  const n = speed.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let gradient = 0;
    if (i > 0) {
      const dDist = distance[i] - distance[i - 1];
      const dAlt = altitude[i] - altitude[i - 1];
      if (dDist > 0.1) gradient = dAlt / dDist;
    }
    out[i] = speed[i] * gradeFactor(gradient);
  }
  return out;
}
