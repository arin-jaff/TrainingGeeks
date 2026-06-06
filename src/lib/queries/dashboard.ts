import type { DB } from "../db/client.js";
import { listActivitiesBetween, listDailyLoad } from "../db/repo.js";
import {
  FITNESS_CURVES,
  modalityToCurve,
  type Modality,
} from "../db/types.js";
import type { LoadCurve } from "../fitness/recompute.js";
import { addDays, startOfWeekMonday } from "../util/dates.js";

export interface PmcPoint {
  date: string;
  stress: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface SummarySlice {
  modality: Modality;
  durationS: number;
}

export interface WeekBar {
  weekStart: string;
  perModality: Partial<Record<Modality, number>>; // seconds
}

export interface DashboardData {
  pmc: Record<LoadCurve, PmcPoint[]>; // last 365 days per curve
  summary: SummarySlice[]; // completed duration by modality, last 28 days
  durationByWeek: WeekBar[]; // last 12 weeks
}

const PMC_CURVES: LoadCurve[] = ["all", ...FITNESS_CURVES];

export function getDashboardData(db: DB, today: string): DashboardData {
  // PMC series per curve.
  const pmc = {} as Record<LoadCurve, PmcPoint[]>;
  const start365 = addDays(today, -365);
  for (const curve of PMC_CURVES) {
    pmc[curve] = listDailyLoad(db, curve, start365, today).map((r) => ({
      date: r.date,
      stress: r.stress,
      ctl: r.ctl,
      atl: r.atl,
      tsb: r.tsb,
    }));
  }

  // Fitness summary: completed duration by modality, last 28 days.
  const last28 = listActivitiesBetween(db, addDays(today, -27), today);
  const byModality = new Map<Modality, number>();
  for (const a of last28) {
    byModality.set(
      a.modality,
      (byModality.get(a.modality) ?? 0) + (a.duration_s ?? 0),
    );
  }
  const summary: SummarySlice[] = [...byModality.entries()]
    .filter(([, d]) => d > 0)
    .map(([modality, durationS]) => ({ modality, durationS }))
    .sort((a, b) => b.durationS - a.durationS);

  // Duration by week (last 12 weeks), stacked by modality.
  const weekStart0 = startOfWeekMonday(addDays(today, -7 * 11));
  const weekActs = listActivitiesBetween(db, weekStart0, today);
  const weekMap = new Map<string, Partial<Record<Modality, number>>>();
  for (const a of weekActs) {
    const wk = startOfWeekMonday(a.local_date);
    const bucket = weekMap.get(wk) ?? {};
    bucket[a.modality] = (bucket[a.modality] ?? 0) + (a.duration_s ?? 0);
    weekMap.set(wk, bucket);
  }
  const durationByWeek: WeekBar[] = [];
  for (let i = 0; i < 12; i++) {
    const wk = addDays(weekStart0, i * 7);
    durationByWeek.push({ weekStart: wk, perModality: weekMap.get(wk) ?? {} });
  }

  return { pmc, summary, durationByWeek };
}

export { modalityToCurve };
