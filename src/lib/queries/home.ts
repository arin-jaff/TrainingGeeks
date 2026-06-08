import type { DB } from "../db/client.js";
import {
  listActivitiesBetween,
  listDailyLoad,
  listEvents,
  listGoals,
  listPaceEfforts,
  listPlannedBetween,
} from "../db/repo.js";
import type { EventRow, GoalRow, Modality } from "../db/types.js";
import type { LoadCurve } from "../fitness/recompute.js";
import { addDays } from "../util/dates.js";
import { MODALITY_LABEL } from "../util/format.js";
import type { CalItem } from "./calendar.js";

export interface CurveMetrics {
  key: LoadCurve;
  label: string;
  ctl: number;
  atl: number;
  tsb: number;
  ramp7: number;
  ramp30: number;
  ramp90: number;
  ramp365: number;
  spark: number[]; // CTL over the last 90 days
}

export interface PeakBest {
  window: number;
  speed: number;
  date: string;
}

export interface HomeData {
  curves: CurveMetrics[];
  todayItems: CalItem[];
  tomorrowItems: CalItem[];
  events: EventRow[];
  goals: GoalRow[];
  peakBests: PeakBest[];
}

const CURVE_LABELS: Record<LoadCurve, string> = {
  all: "All",
  run: "Run",
  bike: "Bike",
  swim: "Swim",
  row: "Row",
  strength: "Strength",
};
const CURVE_ORDER: LoadCurve[] = ["all", "run", "bike", "swim", "row", "strength"];

function curveMetrics(db: DB, key: LoadCurve, today: string): CurveMetrics {
  const start = addDays(today, -365);
  const rows = listDailyLoad(db, key, start, today);
  const byDate = new Map(rows.map((r) => [r.date, r.ctl]));
  const ctlAt = (d: string) => byDate.get(d) ?? 0;
  const cur = rows.length ? rows[rows.length - 1] : null;
  const ctl = cur?.ctl ?? 0;
  return {
    key,
    label: CURVE_LABELS[key],
    ctl,
    atl: cur?.atl ?? 0,
    tsb: cur?.tsb ?? 0,
    ramp7: round(ctl - ctlAt(addDays(today, -7))),
    ramp30: round(ctl - ctlAt(addDays(today, -30))),
    ramp90: round(ctl - ctlAt(addDays(today, -90))),
    ramp365: round(ctl - ctlAt(addDays(today, -365))),
    spark: rows.slice(-90).map((r) => r.ctl),
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function itemsForDate(db: DB, date: string): CalItem[] {
  const acts = listActivitiesBetween(db, date, date);
  const planned = listPlannedBetween(db, date, date);
  const out: CalItem[] = acts.map((a) => ({
    id: a.id,
    kind: "activity",
    modality: a.modality,
    name: a.name ?? MODALITY_LABEL[a.modality],
    durationS: a.duration_s,
    distanceM: a.distance_m,
    avgSpeedMps: a.avg_speed_mps,
    stressValue:
      a.modality === "lift" || a.modality === "core"
        ? a.s3 == null
          ? null
          : Math.round(a.s3)
        : a.tss == null
          ? null
          : Math.round(a.tss),
    stressLabel: a.modality === "lift" || a.modality === "core" ? "S³" : "TSS",
    plannedTss: null,
    elevationM: a.elevation_gain_m ?? 0,
    workKj: a.kj ?? 0,
  }));
  for (const p of planned) {
    if (p.completed_activity_id) continue;
    out.push({
      id: p.id,
      kind: "planned",
      modality: p.modality,
      name: p.name ?? MODALITY_LABEL[p.modality],
      durationS: p.planned_duration_s,
      distanceM: p.planned_distance_m,
      avgSpeedMps: null,
      stressValue: p.planned_tss == null ? null : Math.round(p.planned_tss),
      stressLabel: "TSS",
      plannedTss: p.planned_tss,
      elevationM: 0,
      workKj: 0,
    });
  }
  return out;
}

const PREVIEW_DISTANCES = [400, 800, 1000, 1609.34, 5000];

function peakBests(db: DB): PeakBest[] {
  const efforts = listPaceEfforts(db).filter(
    (e) => (e.modality as Modality) === "run",
  );
  const best = new Map<number, PeakBest>();
  for (const e of efforts) {
    const cur = best.get(e.window);
    if (!cur || e.speed > cur.speed) {
      best.set(e.window, { window: e.window, speed: e.speed, date: e.date });
    }
  }
  return PREVIEW_DISTANCES.map((w) => best.get(w)).filter(
    (b): b is PeakBest => !!b,
  );
}

export function getHomeData(db: DB, today: string): HomeData {
  return {
    curves: CURVE_ORDER.map((c) => curveMetrics(db, c, today)),
    todayItems: itemsForDate(db, today),
    tomorrowItems: itemsForDate(db, addDays(today, 1)),
    events: listEvents(db),
    goals: listGoals(db),
    peakBests: peakBests(db),
  };
}
