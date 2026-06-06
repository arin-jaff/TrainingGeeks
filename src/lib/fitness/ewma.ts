/**
 * Performance Management Chart math: Fitness (CTL), Fatigue (ATL), Form (TSB)
 * as exponentially weighted moving averages of daily training stress.
 *
 *   CTL_t = CTL_{t-1} + (stress_t - CTL_{t-1}) * (1 - e^(-1/42))
 *   ATL_t = ATL_{t-1} + (stress_t - ATL_{t-1}) * (1 - e^(-1/7))
 *   TSB_t = CTL_{t-1} - ATL_{t-1}     (Form uses yesterday's fitness/fatigue)
 */

export const CTL_DAYS = 42;
export const ATL_DAYS = 7;

export interface DayStress {
  date: string; // YYYY-MM-DD, consecutive (caller fills gaps with 0)
  stress: number;
}

export interface FitnessPoint extends DayStress {
  ctl: number;
  atl: number;
  tsb: number;
}

export interface FitnessSeed {
  ctl?: number;
  atl?: number;
}

export function computeFitnessSeries(
  daily: DayStress[],
  seed: FitnessSeed = {},
): FitnessPoint[] {
  const ctlAlpha = 1 - Math.exp(-1 / CTL_DAYS);
  const atlAlpha = 1 - Math.exp(-1 / ATL_DAYS);

  let ctl = seed.ctl ?? 0;
  let atl = seed.atl ?? 0;
  const out: FitnessPoint[] = [];

  for (const { date, stress } of daily) {
    const tsb = ctl - atl; // yesterday's values
    ctl = ctl + (stress - ctl) * ctlAlpha;
    atl = atl + (stress - atl) * atlAlpha;
    out.push({
      date,
      stress,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
    });
  }
  return out;
}
