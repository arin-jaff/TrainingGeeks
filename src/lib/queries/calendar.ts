import type { DB } from "../db/client.js";
import {
  listActivitiesBetween,
  listDailyLoad,
  listPlannedBetween,
} from "../db/repo.js";
import type { Modality } from "../db/types.js";
import { MODALITY_LABEL } from "../util/format.js";

export interface CalItem {
  id: number;
  kind: "activity" | "planned";
  modality: Modality;
  name: string;
  durationS: number | null;
  distanceM: number | null;
  avgSpeedMps: number | null;
  stressValue: number | null;
  stressLabel: string | null;
  plannedTss: number | null;
  elevationM: number;
  workKj: number;
}

export interface WeekSummary {
  weekStart: string;
  durationS: number;
  distanceM: number;
  tss: number;
  elevationM: number;
  workKj: number;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
}

export interface CalendarData {
  itemsByDate: Record<string, CalItem[]>;
  weekSummaries: Record<string, WeekSummary>;
}

function stress(
  modality: Modality,
  tss: number | null,
  s3: number | null,
): { value: number | null; label: string | null } {
  if (modality === "lift" || modality === "core") {
    return { value: s3 == null ? null : Math.round(s3), label: "S³" };
  }
  const label = modality === "run" || modality === "swim" ? "rTSS" : "TSS";
  return { value: tss == null ? null : Math.round(tss), label };
}

export function getCalendarData(
  db: DB,
  weeks: string[][],
): CalendarData {
  const gridStart = weeks[0][0];
  const gridEnd = weeks[weeks.length - 1][6];

  const activities = listActivitiesBetween(db, gridStart, gridEnd);
  const planned = listPlannedBetween(db, gridStart, gridEnd);
  const fitness = listDailyLoad(db, "all", gridStart, gridEnd);
  const fitByDate = new Map(fitness.map((f) => [f.date, f]));

  const itemsByDate: Record<string, CalItem[]> = {};
  const push = (date: string, item: CalItem) => {
    (itemsByDate[date] ??= []).push(item);
  };

  for (const a of activities) {
    const s = stress(a.modality, a.tss, a.s3);
    push(a.local_date, {
      id: a.id,
      kind: "activity",
      modality: a.modality,
      name: a.name ?? MODALITY_LABEL[a.modality],
      durationS: a.duration_s,
      distanceM: a.distance_m,
      avgSpeedMps: a.avg_speed_mps,
      stressValue: s.value,
      stressLabel: s.label,
      plannedTss: null,
      elevationM: a.elevation_gain_m ?? 0,
      workKj: a.kj ?? 0,
    });
  }
  for (const p of planned) {
    if (p.completed_activity_id) continue; // shown as the completed activity
    push(p.date, {
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

  const weekSummaries: Record<string, WeekSummary> = {};
  for (const week of weeks) {
    const weekStart = week[0];
    let durationS = 0;
    let distanceM = 0;
    let tss = 0;
    let elevationM = 0;
    let workKj = 0;
    for (const d of week) {
      for (const it of itemsByDate[d] ?? []) {
        if (it.kind !== "activity") continue;
        durationS += it.durationS ?? 0;
        distanceM += it.distanceM ?? 0;
        tss += it.stressValue ?? 0;
        elevationM += it.elevationM;
        workKj += it.workKj;
      }
    }
    // Use the latest day in the week that has a fitness row (so the current,
    // partially-elapsed week shows today's values instead of a blank Sunday).
    let endFit = undefined;
    for (let i = 6; i >= 0; i--) {
      const f = fitByDate.get(week[i]);
      if (f) {
        endFit = f;
        break;
      }
    }
    weekSummaries[weekStart] = {
      weekStart,
      durationS,
      distanceM,
      tss,
      elevationM,
      workKj,
      ctl: endFit?.ctl ?? null,
      atl: endFit?.atl ?? null,
      tsb: endFit?.tsb ?? null,
    };
  }

  return { itemsByDate, weekSummaries };
}
