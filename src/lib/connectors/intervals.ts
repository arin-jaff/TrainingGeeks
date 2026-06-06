import type { DB } from "../db/client.js";
import {
  getConnector,
  upsertConnector,
  deletePlannedBySource,
  insertPlanned,
} from "../db/repo.js";
import type { Modality } from "../db/types.js";
import { importFitBuffer } from "../import/service.js";
import { recomputeFitness } from "../fitness/recompute.js";
import { addDays, todayLocal } from "../util/dates.js";

const BASE = "https://intervals.icu";

export interface IntervalsActivity {
  id: string;
  start_date_local?: string;
  type?: string;
  name?: string;
}

export interface IntervalsEvent {
  start_date_local?: string;
  category?: string;
  type?: string;
  name?: string;
  description?: string;
  moving_time?: number; // seconds
  icu_training_load?: number; // planned TSS
}

/** Map an intervals.icu / Strava-style activity type to a modality. */
export function mapIntervalsType(type: string | undefined): Modality {
  const t = (type ?? "").toLowerCase();
  if (t.includes("run") || t.includes("walk") || t.includes("hike")) return "run";
  if (t.includes("ride") || t.includes("cycl") || t.includes("bike"))
    return "bike";
  if (t.includes("swim")) return "swim";
  if (t.includes("weight") || t.includes("strength")) return "lift";
  if (t.includes("yoga") || t.includes("core") || t.includes("mobility"))
    return "core";
  return "lift";
}

function authHeader(apiKey: string): string {
  const token = Buffer.from(`API_KEY:${apiKey}`).toString("base64");
  return `Basic ${token}`;
}

async function api(
  path: string,
  apiKey: string,
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    headers: { Authorization: authHeader(apiKey) },
  });
}

export async function listActivities(
  athleteId: string,
  apiKey: string,
  oldest: string,
  newest: string,
): Promise<IntervalsActivity[]> {
  const res = await api(
    `/api/v1/athlete/${athleteId}/activities?oldest=${oldest}&newest=${newest}`,
    apiKey,
  );
  if (!res.ok) throw new Error(`activities ${res.status}`);
  return (await res.json()) as IntervalsActivity[];
}

export async function downloadActivityFit(
  activityId: string,
  apiKey: string,
): Promise<Uint8Array | null> {
  const res = await api(`/api/v1/activity/${activityId}/fit-file`, apiKey);
  if (res.status === 404) return null; // manual/strength entries may lack a FIT
  if (!res.ok) throw new Error(`fit ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function listEvents(
  athleteId: string,
  apiKey: string,
  oldest: string,
  newest: string,
): Promise<IntervalsEvent[]> {
  const res = await api(
    `/api/v1/athlete/${athleteId}/events?oldest=${oldest}&newest=${newest}&category=WORKOUT`,
    apiKey,
  );
  if (!res.ok) throw new Error(`events ${res.status}`);
  return (await res.json()) as IntervalsEvent[];
}

export interface SyncResult {
  imported: number;
  duplicates: number;
  skipped: number;
  planned: number;
  errors: string[];
}

/**
 * Pull recent activities and planned workouts from intervals.icu. Idempotent:
 * activities dedupe by FIT content hash; planned workouts for the window are
 * replaced. Advances the sync cursor to today.
 */
export async function syncIntervals(
  db: DB,
  opts: { lookbackDays?: number; planAheadDays?: number } = {},
): Promise<SyncResult> {
  const acct = getConnector(db, "intervals");
  const result: SyncResult = {
    imported: 0,
    duplicates: 0,
    skipped: 0,
    planned: 0,
    errors: [],
  };
  if (!acct?.enabled || !acct.api_key || !acct.athlete_id) {
    result.errors.push("intervals.icu not configured");
    return result;
  }

  const today = todayLocal("UTC");
  const oldest =
    acct.last_sync_cursor ?? addDays(today, -(opts.lookbackDays ?? 30));

  // Completed activities.
  let activities: IntervalsActivity[] = [];
  try {
    activities = await listActivities(
      acct.athlete_id,
      acct.api_key,
      oldest,
      today,
    );
  } catch (e) {
    result.errors.push(`activities: ${(e as Error).message}`);
  }

  for (const act of activities) {
    try {
      const fit = await downloadActivityFit(act.id, acct.api_key);
      if (!fit) {
        result.skipped++;
        continue;
      }
      const r = importFitBuffer(db, fit, "intervals", { recompute: false });
      if (r.status === "imported") result.imported++;
      else result.duplicates++;
    } catch (e) {
      result.errors.push(`activity ${act.id}: ${(e as Error).message}`);
    }
  }

  // Planned workouts (replace the future window from this source).
  const planAhead = addDays(today, opts.planAheadDays ?? 60);
  try {
    const events = await listEvents(
      acct.athlete_id,
      acct.api_key,
      today,
      planAhead,
    );
    deletePlannedBySource(db, "intervals", today, planAhead);
    for (const ev of events) {
      const date = (ev.start_date_local ?? "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      insertPlanned(db, {
        modality: mapIntervalsType(ev.type),
        date,
        name: ev.name ?? null,
        description: ev.description ?? null,
        planned_duration_s: ev.moving_time ?? null,
        planned_tss: ev.icu_training_load ?? null,
        source: "intervals",
      });
      result.planned++;
    }
  } catch (e) {
    result.errors.push(`events: ${(e as Error).message}`);
  }

  if (result.imported > 0) recomputeFitness(db);
  upsertConnector(db, "intervals", { enabled: 1, last_sync_cursor: today });
  return result;
}
