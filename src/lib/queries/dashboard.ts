import type { DB } from "../db/client.js";
import {
  getActivityStream,
  listActivitiesBetween,
  listDailyLoad,
  listZonesFor,
} from "../db/repo.js";
import {
  FITNESS_CURVES,
  isCardio,
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

export interface Totals {
  count: number;
  durationS: number;
  distanceM: number;
  tss: number;
  elevationM: number;
}

export interface ZoneTime {
  labels: string[];
  seconds: number[];
}

export interface DashboardData {
  pmc: Record<LoadCurve, PmcPoint[]>; // last 365 days per curve
  summary: SummarySlice[]; // completed duration by modality, last 28 days
  durationByWeek: WeekBar[]; // last 12 weeks
  totals: Totals; // last 28 days
  hrZoneTime: ZoneTime | null; // time in HR zones, last 120 days
  powerZoneTime: ZoneTime | null;
}

function zoneTime(
  db: DB,
  acts: { id: number }[],
  channel: "hr" | "power",
  curve: string,
): ZoneTime | null {
  const zones = listZonesFor(db, curve, channel === "hr" ? "hr" : "power");
  if (!zones.length) return null;
  const sorted = [...zones].sort((a, b) => a.zone_index - b.zone_index);
  const seconds = new Array(sorted.length).fill(0);
  for (const a of acts) {
    const s = getActivityStream(db, a.id);
    const ch = s?.[channel];
    if (!ch) continue;
    for (const raw of ch) {
      if (raw == null || !Number.isFinite(raw) || raw <= 0) continue;
      const v = raw as number;
      let idx = sorted.findIndex((z) => v >= z.low && v <= z.high);
      if (idx < 0 && v > sorted[sorted.length - 1].high) idx = sorted.length - 1;
      if (idx >= 0) seconds[idx] += 1; // ~1 Hz samples
    }
  }
  return seconds.some((x) => x > 0)
    ? { labels: sorted.map((z) => z.name), seconds }
    : null;
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
  const totals: Totals = { count: 0, durationS: 0, distanceM: 0, tss: 0, elevationM: 0 };
  for (const a of last28) {
    byModality.set(
      a.modality,
      (byModality.get(a.modality) ?? 0) + (a.duration_s ?? 0),
    );
    totals.count += 1;
    totals.durationS += a.duration_s ?? 0;
    totals.distanceM += a.distance_m ?? 0;
    totals.tss += (isCardio(a.modality as Modality) ? a.tss : a.s3) ?? 0;
    totals.elevationM += a.elevation_gain_m ?? 0;
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

  // Time in zones over the last 120 days (loads streams for those activities).
  const recent = listActivitiesBetween(db, addDays(today, -120), today);
  const hrZoneTime = zoneTime(db, recent, "hr", "run");
  const powerZoneTime = zoneTime(db, recent, "power", "bike");

  return { pmc, summary, durationByWeek, totals, hrZoneTime, powerZoneTime };
}

export { modalityToCurve };
