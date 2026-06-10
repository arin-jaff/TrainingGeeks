import type { DB } from "../db/client.js";
import {
  getAthlete,
  listActivitiesBetween,
  listDailyLoad,
  listPaceEfforts,
  listPlannedBetween,
} from "../db/repo.js";
import { addDays, todayLocal } from "../util/dates.js";
import { SCOPES, type Scope } from "./client.js";

const WINDOW_DAYS = 90;

/** SI-only, friend-safe items — never includes private notes. */
function calendar(db: DB, start: string, today: string) {
  const acts = listActivitiesBetween(db, start, today).map((a) => ({
    kind: "activity" as const,
    date: a.local_date,
    modality: a.modality,
    name: a.name,
    durationS: a.duration_s,
    distanceM: a.distance_m,
    tss: a.tss,
    s3: a.s3,
  }));
  const planned = listPlannedBetween(db, start, today)
    .filter((p) => !p.completed_activity_id)
    .map((p) => ({
      kind: "planned" as const,
      date: p.date,
      modality: p.modality,
      name: p.name,
      durationS: p.planned_duration_s,
      distanceM: p.planned_distance_m,
      tss: p.planned_tss,
      s3: null,
    }));
  return [...acts, ...planned];
}

function activities(db: DB, start: string, today: string) {
  return listActivitiesBetween(db, start, today).map((a) => ({
    id: a.id,
    date: a.local_date,
    modality: a.modality,
    name: a.name,
    durationS: a.duration_s,
    distanceM: a.distance_m,
    avgSpeedMps: a.avg_speed_mps,
    avgHr: a.avg_hr,
    maxHr: a.max_hr,
    elevationGainM: a.elevation_gain_m,
    tss: a.tss,
    s3: a.s3,
    intensityFactor: a.intensity_factor,
  }));
}

function pmc(db: DB, start: string, today: string) {
  return listDailyLoad(db, "all", start, today).map((d) => ({
    date: d.date,
    ctl: d.ctl,
    atl: d.atl,
    tsb: d.tsb,
  }));
}

function peaks(db: DB) {
  const best = new Map<number, { window: number; speed: number; date: string }>();
  for (const e of listPaceEfforts(db)) {
    if (e.modality !== "run") continue;
    const cur = best.get(e.window);
    if (!cur || e.speed > cur.speed)
      best.set(e.window, { window: e.window, speed: e.speed, date: e.date });
  }
  return [...best.values()].sort((a, b) => a.window - b.window);
}

export function isScope(s: string): s is Scope {
  return (SCOPES as readonly string[]).includes(s);
}

/**
 * Build the friend-visible payload for one scope. Pure read of the owner's DB,
 * windowed and stripped of anything private. Returns null for unknown scopes.
 */
export function buildSharedPayload(db: DB, scope: string): unknown | null {
  if (!isScope(scope)) return null;
  const tz = getAthlete(db)?.timezone ?? "America/New_York";
  const today = todayLocal(tz);
  const start = addDays(today, -WINDOW_DAYS);

  switch (scope) {
    case "calendar":
      return { scope, today, items: calendar(db, start, today) };
    case "activities":
      return { scope, activities: activities(db, start, today) };
    case "pmc":
      return { scope, curve: pmc(db, start, today) };
    case "peaks":
      return { scope, bests: peaks(db) };
  }
}
