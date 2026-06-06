import type { DB } from "../db/client.js";
import {
  clearDailyLoad,
  earliestActivityDate,
  getAthlete,
  listActivityStress,
  upsertDailyLoad,
} from "../db/repo.js";
import {
  FITNESS_CURVES,
  isCardio,
  modalityToCurve,
  type FitnessCurve,
  type Modality,
} from "../db/types.js";
import { addDays, eachDay, todayLocal } from "../util/dates.js";
import { computeFitnessSeries } from "./ewma.js";

export type LoadCurve = FitnessCurve | "all";
const ALL_CURVES: LoadCurve[] = [...FITNESS_CURVES, "all"];

/**
 * Recompute every daily fitness curve from scratch and cache it in
 * daily_load. Full recompute is O(days) and runs after each import/edit, so
 * curves stay consistent even when activities are deleted. Per modality plus
 * the combined 'all'. Cardio contributes TSS; strength (lift+core) S³.
 */
const PROJECT_DAYS = 60; // project fitness forward (zero future stress), like TP

export function recomputeFitness(db: DB, today?: string): void {
  const earliest = earliestActivityDate(db);
  clearDailyLoad(db);
  if (!earliest) return;

  const tz = getAthlete(db)?.timezone ?? "America/New_York";
  const end = today ?? todayLocal(tz);
  // Extend past today so upcoming weeks show projected CTL/ATL/TSB decay.
  const horizon = addDays(end >= earliest ? end : earliest, PROJECT_DAYS);
  const lastDate = horizon;

  // Sum daily stress per curve.
  const buckets = new Map<LoadCurve, Map<string, number>>();
  for (const c of ALL_CURVES) buckets.set(c, new Map());

  for (const row of listActivityStress(db)) {
    const modality = row.modality as Modality;
    const stress = (isCardio(modality) ? row.tss : row.s3) ?? 0;
    if (stress === 0) continue;
    const curve = modalityToCurve(modality);
    addStress(buckets.get(curve)!, row.local_date, stress);
    addStress(buckets.get("all")!, row.local_date, stress);
  }

  const days = eachDay(earliest, lastDate);
  for (const curve of ALL_CURVES) {
    const map = buckets.get(curve)!;
    const series = computeFitnessSeries(
      days.map((d) => ({ date: d, stress: map.get(d) ?? 0 })),
    );
    for (const p of series) {
      upsertDailyLoad(db, {
        date: p.date,
        curve,
        stress: p.stress,
        ctl: p.ctl,
        atl: p.atl,
        tsb: p.tsb,
      });
    }
  }
}

function addStress(map: Map<string, number>, date: string, stress: number): void {
  map.set(date, (map.get(date) ?? 0) + stress);
}
