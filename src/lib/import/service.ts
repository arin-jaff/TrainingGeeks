import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DB } from "../db/client.js";
import {
  getActivityByHash,
  getAthlete,
  getEffectiveThreshold,
  insertActivity,
  replaceStrengthSets,
  setActivityStream,
  type NewActivity,
} from "../db/repo.js";
import { modalityToCurve, type ActivitySource } from "../db/types.js";
import { decodeFit } from "../fit/parse.js";
import { normalizeDecoded } from "../fit/normalize.js";
import type { NormalizedActivity } from "../fit/types.js";
import { computeCardioMetrics } from "../metrics/cardio.js";
import { computeS3 } from "../metrics/strength.js";
import { computePeaks } from "../metrics/peaks.js";
import { recomputeFitness } from "../fitness/recompute.js";
import { localDateInTz } from "../util/dates.js";

export type ImportStatus = "imported" | "duplicate";

export interface ImportResult {
  status: ImportStatus;
  activityId: number;
  modality: string;
  fitHash: string;
}

function rawDir(): string {
  const dir = join(process.cwd(), "data", "fit", "raw");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

const MODALITY_LABEL: Record<string, string> = {
  run: "Run",
  bike: "Bike",
  swim: "Swim",
  lift: "Strength",
  core: "Core",
};

/**
 * Import a single activity from FIT bytes (raw or gzipped). Idempotent: a file
 * whose decompressed content hash already exists is skipped. Computes metrics
 * (TSS for cardio, S³ for strength), stores the raw FIT, laps, peaks and the
 * stream, then recomputes the fitness curves.
 */
export function importFitBuffer(
  db: DB,
  input: Uint8Array | Buffer,
  source: ActivitySource = "manual",
  opts: { rpe?: number; recompute?: boolean; storeRaw?: boolean } = {},
): ImportResult {
  const decoded = decodeFit(input);
  const normalized = normalizeDecoded(decoded.messages, decoded.bytes);

  const existing = getActivityByHash(db, normalized.fitHash);
  if (existing) {
    return {
      status: "duplicate",
      activityId: existing.id,
      modality: existing.modality,
      fitHash: normalized.fitHash,
    };
  }

  const activityId = persist(
    db,
    normalized,
    decoded.bytes,
    source,
    opts.rpe,
    opts.storeRaw !== false,
  );
  if (opts.recompute !== false) recomputeFitness(db);
  return {
    status: "imported",
    activityId,
    modality: normalized.modality,
    fitHash: normalized.fitHash,
  };
}

function persist(
  db: DB,
  n: NormalizedActivity,
  bytes: Uint8Array,
  source: ActivitySource,
  rpeOverride: number | undefined,
  storeRaw: boolean,
): number {
  const athlete = getAthlete(db);
  const tz = athlete?.timezone ?? "America/New_York";
  const localDate = localDateInTz(n.startTime, tz);
  const curve = modalityToCurve(n.modality);
  const isStrength = n.modality === "lift" || n.modality === "core";
  const durationS = n.summary.durationS ?? n.summary.elapsedS ?? 0;

  // Resolve thresholds in effect on the activity date.
  const thresholds = {
    ftp:
      n.modality === "bike"
        ? (getEffectiveThreshold(db, "bike", "ftp", localDate) ?? null)
        : null,
    thresholdSpeed:
      getEffectiveThreshold(db, curve, "threshold_pace", localDate) ?? null,
    thresholdHr:
      getEffectiveThreshold(db, curve, "threshold_hr", localDate) ??
      getEffectiveThreshold(db, "run", "threshold_hr", localDate) ??
      null,
  };

  const cardio = computeCardioMetrics(n, thresholds);
  const rpe = rpeOverride ?? athlete?.strength_rpe_default ?? 5;
  const s3 = isStrength ? computeS3(durationS, rpe) : null;

  // Store the decompressed raw FIT keyed by content hash.
  let rawPath: string | null = null;
  if (storeRaw) {
    rawPath = join("data", "fit", "raw", `${n.fitHash}.fit`);
    writeFileSync(join(rawDir(), `${n.fitHash}.fit`), Buffer.from(bytes));
  }

  const row: NewActivity = {
    modality: n.modality,
    sport_detail: n.subSport ?? n.sport ?? null,
    source,
    fit_hash: n.fitHash,
    raw_path: rawPath,
    start_time: n.startTime,
    local_date: localDate,
    timezone: tz,
    name: MODALITY_LABEL[n.modality] ?? n.modality,
    duration_s: durationS || null,
    elapsed_s: n.summary.elapsedS,
    distance_m: n.summary.distanceM,
    elevation_gain_m: n.summary.elevationGainM,
    avg_hr: n.summary.avgHr,
    max_hr: n.summary.maxHr,
    avg_power: n.summary.avgPower,
    max_power: n.summary.maxPower,
    np: cardio.np,
    avg_speed_mps: n.summary.avgSpeedMps,
    max_speed_mps: n.summary.maxSpeedMps,
    avg_cadence: n.summary.avgCadence,
    max_cadence: n.summary.maxCadence,
    calories: n.summary.calories,
    kj: n.summary.kj ?? cardio.work,
    tss: cardio.tss,
    s3,
    intensity_factor: cardio.intensityFactor,
    variability_index: cardio.variabilityIndex,
    efficiency_factor: cardio.efficiencyFactor,
    decoupling: cardio.decoupling,
    rpe: isStrength ? rpe : null,
    metrics_version: 1,
  };

  const activityId = insertActivity(db, row);
  // StreamChannels is stored as a generic columnar record by the DB layer.
  setActivityStream(
    db,
    activityId,
    n.channels as unknown as Record<string, (number | null)[]>,
  );
  insertLaps(db, activityId, n);
  insertPeaks(db, activityId, n);
  if (n.sets.length > 0) {
    replaceStrengthSets(
      db,
      activityId,
      n.sets.map((s) => ({
        set_index: s.setIndex,
        exercise_key: s.exerciseKey,
        reps: s.reps,
        duration_s: s.durationS,
        rest_s: s.restS,
        weight_kg: s.weightKg,
      })),
    );
  }
  return activityId;
}

function insertLaps(db: DB, activityId: number, n: NormalizedActivity): void {
  const stmt = db.prepare(
    `INSERT INTO lap (activity_id, lap_index, start_time, duration_s, distance_m,
       avg_hr, max_hr, avg_power, max_power, np, avg_speed_mps, avg_cadence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const l of n.laps) {
    stmt.run(
      activityId,
      l.lapIndex,
      l.startTime,
      l.durationS,
      l.distanceM,
      l.avgHr,
      l.maxHr,
      l.avgPower,
      l.maxPower,
      l.np,
      l.avgSpeedMps,
      l.avgCadence,
    );
  }
}

function insertPeaks(db: DB, activityId: number, n: NormalizedActivity): void {
  const peaks = computePeaks(n.channels);
  const stmt = db.prepare(
    `INSERT INTO peak (activity_id, kind, basis, window, value, start_offset_s)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const p of peaks.power)
    stmt.run(activityId, "power", "duration", p.window, p.value, p.startOffsetS);
  for (const p of peaks.hr)
    stmt.run(activityId, "hr", "duration", p.window, p.value, p.startOffsetS);
  for (const p of peaks.pace)
    stmt.run(activityId, "pace", "distance", p.window, p.speed, p.startOffsetS);
}
