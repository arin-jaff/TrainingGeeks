import type { DB } from "./client.js";
import type {
  ActivityRow,
  AthleteRow,
  ConnectorAccountRow,
  DailyLoadRow,
  EventRow,
  FitnessCurve,
  GoalRow,
  PlannedWorkoutRow,
  ThresholdMetric,
  ThresholdRow,
  ZoneRow,
} from "./types.js";

// node:sqlite returns null-prototype rows; spread into plain objects so they
// are serializable across the server/client boundary and structurally typed.
function all<T>(db: DB, sql: string, ...params: unknown[]): T[] {
  const rows = db.prepare(sql).all(...(params as never[]));
  return rows.map((r) => ({ ...r }) as unknown as T);
}
function one<T>(db: DB, sql: string, ...params: unknown[]): T | undefined {
  const r = db.prepare(sql).get(...(params as never[]));
  return r ? ({ ...r } as unknown as T) : undefined;
}

// ---- Athlete -----------------------------------------------------------

export function getAthlete(db: DB): AthleteRow | undefined {
  return one<AthleteRow>(db, "SELECT * FROM athlete WHERE id = 1");
}

export function updateAthlete(db: DB, patch: Partial<AthleteRow>): void {
  const fields = Object.keys(patch).filter((k) => k !== "id");
  if (fields.length === 0) return;
  const set = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (patch as Record<string, unknown>)[f]);
  db.prepare(
    `UPDATE athlete SET ${set}, updated_at = datetime('now') WHERE id = 1`,
  ).run(...(values as never[]));
}

// ---- Thresholds --------------------------------------------------------

/** The threshold value in effect on `date` (most recent valid_from <= date). */
export function getEffectiveThreshold(
  db: DB,
  curve: FitnessCurve,
  metric: ThresholdMetric,
  date: string,
): number | undefined {
  const row = one<{ value: number }>(
    db,
    `SELECT value FROM threshold
     WHERE curve = ? AND metric = ? AND valid_from <= ?
     ORDER BY valid_from DESC LIMIT 1`,
    curve,
    metric,
    date,
  );
  return row?.value;
}

export function setThreshold(
  db: DB,
  curve: FitnessCurve,
  metric: ThresholdMetric,
  value: number,
  validFrom: string,
): void {
  db.prepare(
    `INSERT INTO threshold (curve, metric, value, valid_from) VALUES (?, ?, ?, ?)`,
  ).run(curve, metric, value, validFrom);
}

export function listThresholds(db: DB): ThresholdRow[] {
  return all<ThresholdRow>(
    db,
    "SELECT * FROM threshold ORDER BY curve, metric, valid_from DESC",
  );
}

// ---- Zones -------------------------------------------------------------

export function listZones(db: DB, curve?: FitnessCurve): ZoneRow[] {
  if (curve) {
    return all<ZoneRow>(
      db,
      "SELECT * FROM zone WHERE curve = ? ORDER BY metric, valid_from DESC, zone_index",
      curve,
    );
  }
  return all<ZoneRow>(
    db,
    "SELECT * FROM zone ORDER BY curve, metric, zone_index",
  );
}

// ---- Activities --------------------------------------------------------

const ACTIVITY_COLUMNS = [
  "modality",
  "sport_detail",
  "source",
  "fit_hash",
  "raw_path",
  "start_time",
  "local_date",
  "timezone",
  "name",
  "notes",
  "duration_s",
  "elapsed_s",
  "distance_m",
  "elevation_gain_m",
  "avg_hr",
  "max_hr",
  "avg_power",
  "max_power",
  "np",
  "avg_speed_mps",
  "max_speed_mps",
  "avg_cadence",
  "max_cadence",
  "calories",
  "kj",
  "tss",
  "s3",
  "intensity_factor",
  "variability_index",
  "efficiency_factor",
  "decoupling",
  "rpe",
  "route_polyline",
  "metrics_version",
] as const;

export type NewActivity = Partial<
  Omit<ActivityRow, "id" | "created_at" | "updated_at">
> &
  Pick<ActivityRow, "modality" | "start_time" | "local_date">;

export function insertActivity(db: DB, a: NewActivity): number {
  const cols = ACTIVITY_COLUMNS.filter(
    (c) => (a as Record<string, unknown>)[c] !== undefined,
  );
  const placeholders = cols.map(() => "?").join(", ");
  const values = cols.map((c) => (a as Record<string, unknown>)[c] ?? null);
  const info = db
    .prepare(
      `INSERT INTO activity (${cols.join(", ")}) VALUES (${placeholders})`,
    )
    .run(...(values as never[]));
  return Number(info.lastInsertRowid);
}

export function getActivity(db: DB, id: number): ActivityRow | undefined {
  return one<ActivityRow>(db, "SELECT * FROM activity WHERE id = ?", id);
}

export function getActivityByHash(
  db: DB,
  hash: string,
): ActivityRow | undefined {
  return one<ActivityRow>(db, "SELECT * FROM activity WHERE fit_hash = ?", hash);
}

export function listActivitiesBetween(
  db: DB,
  startDate: string,
  endDate: string,
): ActivityRow[] {
  return all<ActivityRow>(
    db,
    `SELECT * FROM activity WHERE local_date >= ? AND local_date <= ?
     ORDER BY start_time`,
    startDate,
    endDate,
  );
}

export function updateActivityMetrics(
  db: DB,
  id: number,
  metrics: Partial<ActivityRow>,
): void {
  const fields = Object.keys(metrics).filter(
    (k) => k !== "id" && k !== "created_at",
  );
  if (fields.length === 0) return;
  const set = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (metrics as Record<string, unknown>)[f]);
  db.prepare(
    `UPDATE activity SET ${set}, updated_at = datetime('now') WHERE id = ?`,
  ).run(...(values as never[]), id);
}

export function deleteActivity(db: DB, id: number): void {
  db.prepare("DELETE FROM activity WHERE id = ?").run(id);
}

// ---- Activity streams --------------------------------------------------

export function setActivityStream(
  db: DB,
  activityId: number,
  channels: Record<string, (number | null)[]>,
): void {
  const counts = Object.values(channels).map((c) => c.length);
  const sampleCount = counts.length ? Math.max(...counts) : 0;
  db.prepare(
    `INSERT INTO activity_stream (activity_id, sample_count, channels)
     VALUES (?, ?, ?)
     ON CONFLICT (activity_id) DO UPDATE SET sample_count = excluded.sample_count, channels = excluded.channels`,
  ).run(activityId, sampleCount, JSON.stringify(channels));
}

export function getActivityStream(
  db: DB,
  activityId: number,
): Record<string, (number | null)[]> | undefined {
  const row = one<{ channels: string }>(
    db,
    "SELECT channels FROM activity_stream WHERE activity_id = ?",
    activityId,
  );
  return row ? JSON.parse(row.channels) : undefined;
}

// ---- Daily load (fitness curves) --------------------------------------

export function upsertDailyLoad(db: DB, row: Omit<DailyLoadRow, "id">): void {
  db.prepare(
    `INSERT INTO daily_load (date, curve, stress, ctl, atl, tsb)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (date, curve) DO UPDATE SET
       stress = excluded.stress, ctl = excluded.ctl,
       atl = excluded.atl, tsb = excluded.tsb`,
  ).run(row.date, row.curve, row.stress, row.ctl, row.atl, row.tsb);
}

export function listDailyLoad(
  db: DB,
  curve: DailyLoadRow["curve"],
  startDate: string,
  endDate: string,
): DailyLoadRow[] {
  return all<DailyLoadRow>(
    db,
    `SELECT * FROM daily_load WHERE curve = ? AND date >= ? AND date <= ?
     ORDER BY date`,
    curve,
    startDate,
    endDate,
  );
}

/** Per-activity stress inputs for the fitness engine. */
export function listActivityStress(
  db: DB,
): { local_date: string; modality: string; tss: number | null; s3: number | null }[] {
  return all(db, "SELECT local_date, modality, tss, s3 FROM activity");
}

export function clearDailyLoad(db: DB): void {
  db.prepare("DELETE FROM daily_load").run();
}

export function earliestActivityDate(db: DB): string | undefined {
  const r = one<{ d: string }>(
    db,
    "SELECT MIN(local_date) AS d FROM activity",
  );
  return r?.d ?? undefined;
}

// ---- Planned workouts --------------------------------------------------

export function listPlannedBetween(
  db: DB,
  startDate: string,
  endDate: string,
): PlannedWorkoutRow[] {
  return all<PlannedWorkoutRow>(
    db,
    `SELECT * FROM planned_workout WHERE date >= ? AND date <= ? ORDER BY date`,
    startDate,
    endDate,
  );
}

export interface NewPlanned {
  modality: string;
  date: string;
  name?: string | null;
  description?: string | null;
  planned_duration_s?: number | null;
  planned_distance_m?: number | null;
  planned_tss?: number | null;
  source: string;
}

export function insertPlanned(db: DB, p: NewPlanned): number {
  const info = db
    .prepare(
      `INSERT INTO planned_workout
         (modality, date, name, description, planned_duration_s, planned_distance_m, planned_tss, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      p.modality,
      p.date,
      p.name ?? null,
      p.description ?? null,
      p.planned_duration_s ?? null,
      p.planned_distance_m ?? null,
      p.planned_tss ?? null,
      p.source,
    );
  return Number(info.lastInsertRowid);
}

export function deletePlannedBySource(
  db: DB,
  source: string,
  startDate: string,
  endDate: string,
): void {
  db.prepare(
    `DELETE FROM planned_workout
     WHERE source = ? AND date >= ? AND date <= ? AND completed_activity_id IS NULL`,
  ).run(source, startDate, endDate);
}

export function setPlannedDate(db: DB, id: number, date: string): void {
  db.prepare(
    `UPDATE planned_workout SET date = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(date, id);
}

export function setActivityDate(db: DB, id: number, localDate: string): void {
  db.prepare(
    `UPDATE activity SET local_date = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(localDate, id);
}

// ---- Peaks -------------------------------------------------------------

export interface PaceEffortRow {
  window: number;
  speed: number;
  activity_id: number;
  date: string;
  modality: string;
}

export interface PeakRow {
  id: number;
  activity_id: number;
  kind: string;
  basis: string;
  window: number;
  value: number;
  start_offset_s: number | null;
}

export function listActivityPeaks(db: DB, activityId: number): PeakRow[] {
  return all<PeakRow>(
    db,
    "SELECT * FROM peak WHERE activity_id = ? ORDER BY kind, window",
    activityId,
  );
}

/** All pace-by-distance peak efforts, joined with their activity. */
export function listPaceEfforts(db: DB): PaceEffortRow[] {
  return all<PaceEffortRow>(
    db,
    `SELECT p.window AS window, p.value AS speed, p.activity_id AS activity_id,
            a.local_date AS date, a.modality AS modality
     FROM peak p JOIN activity a ON a.id = p.activity_id
     WHERE p.kind = 'pace' AND p.basis = 'distance'
     ORDER BY p.window ASC, p.value DESC`,
  );
}

// ---- Connector accounts ------------------------------------------------

export function getConnector(
  db: DB,
  provider: string,
): ConnectorAccountRow | undefined {
  return one<ConnectorAccountRow>(
    db,
    "SELECT * FROM connector_account WHERE provider = ?",
    provider,
  );
}

export function upsertConnector(
  db: DB,
  provider: string,
  patch: Partial<ConnectorAccountRow>,
): void {
  db.prepare(
    `INSERT INTO connector_account (provider, api_key, athlete_id, last_sync_cursor, enabled)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (provider) DO UPDATE SET
       api_key = COALESCE(excluded.api_key, connector_account.api_key),
       athlete_id = COALESCE(excluded.athlete_id, connector_account.athlete_id),
       last_sync_cursor = COALESCE(excluded.last_sync_cursor, connector_account.last_sync_cursor),
       enabled = excluded.enabled,
       updated_at = datetime('now')`,
  ).run(
    provider,
    patch.api_key ?? null,
    patch.athlete_id ?? null,
    patch.last_sync_cursor ?? null,
    patch.enabled ?? 0,
  );
}

// ---- Events & goals ----------------------------------------------------

export function listEvents(db: DB): EventRow[] {
  return all<EventRow>(db, "SELECT * FROM event ORDER BY date");
}

export function insertEvent(
  db: DB,
  name: string,
  date: string,
  notes?: string,
): void {
  db.prepare("INSERT INTO event (name, date, notes) VALUES (?, ?, ?)").run(
    name,
    date,
    notes ?? null,
  );
}

export function deleteEvent(db: DB, id: number): void {
  db.prepare("DELETE FROM event WHERE id = ?").run(id);
}

export function listGoals(db: DB): GoalRow[] {
  return all<GoalRow>(db, "SELECT * FROM goal ORDER BY done, created_at");
}

export function insertGoal(db: DB, text: string): void {
  db.prepare("INSERT INTO goal (text) VALUES (?)").run(text);
}

export function setGoalDone(db: DB, id: number, done: boolean): void {
  db.prepare("UPDATE goal SET done = ? WHERE id = ?").run(done ? 1 : 0, id);
}

export function deleteGoal(db: DB, id: number): void {
  db.prepare("DELETE FROM goal WHERE id = ?").run(id);
}
