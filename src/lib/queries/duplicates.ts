import type { DB } from "../db/client.js";
import { getSetting, listActivitiesForDupeScan, type DupeScanRow } from "../db/repo.js";
import type { Modality } from "../db/types.js";

/**
 * Duplicate detection. The same session recorded twice — watch + phone, or an
 * intervals.icu sync landing next to a manual FIT upload — produces two rows
 * whose clocks overlap but whose numbers differ slightly (10.3 mi vs 10.0 mi).
 * Content hashing can't catch that, so we compare time spans instead and let
 * the athlete confirm each pair by hand.
 */

export type FieldKind =
  | "duration"
  | "distance"
  | "elevation"
  | "speed"
  | "number"
  | "decimal"
  | "text";

export interface DupeFieldDef {
  /** activity column — the merge whitelist is derived from these keys */
  key: string;
  label: string;
  kind: FieldKind;
  /** how much having this field counts toward "the richer recording" */
  weight: number;
}

/** Mergeable columns, most load-bearing first. */
export const DUPE_FIELDS: readonly DupeFieldDef[] = [
  { key: "distance_m", label: "Distance", kind: "distance", weight: 10 },
  { key: "duration_s", label: "Moving Time", kind: "duration", weight: 10 },
  { key: "elapsed_s", label: "Elapsed Time", kind: "duration", weight: 3 },
  { key: "elevation_gain_m", label: "Elevation Gain", kind: "elevation", weight: 6 },
  { key: "avg_hr", label: "Avg HR", kind: "number", weight: 7 },
  { key: "max_hr", label: "Max HR", kind: "number", weight: 4 },
  { key: "avg_power", label: "Avg Power", kind: "number", weight: 7 },
  { key: "max_power", label: "Max Power", kind: "number", weight: 3 },
  { key: "np", label: "Normalized Power", kind: "number", weight: 3 },
  { key: "avg_speed_mps", label: "Avg Speed", kind: "speed", weight: 5 },
  { key: "max_speed_mps", label: "Max Speed", kind: "speed", weight: 2 },
  { key: "avg_cadence", label: "Avg Cadence", kind: "number", weight: 3 },
  { key: "max_cadence", label: "Max Cadence", kind: "number", weight: 1 },
  { key: "calories", label: "Calories", kind: "number", weight: 2 },
  { key: "kj", label: "Work", kind: "number", weight: 2 },
  { key: "tss", label: "TSS", kind: "number", weight: 4 },
  { key: "s3", label: "S³", kind: "number", weight: 4 },
  { key: "intensity_factor", label: "IF", kind: "decimal", weight: 2 },
  { key: "variability_index", label: "VI", kind: "decimal", weight: 1 },
  { key: "efficiency_factor", label: "EF", kind: "decimal", weight: 1 },
  { key: "decoupling", label: "Decoupling", kind: "decimal", weight: 1 },
  { key: "rpe", label: "RPE", kind: "number", weight: 2 },
  { key: "name", label: "Title", kind: "text", weight: 2 },
  { key: "sport_detail", label: "Sport Detail", kind: "text", weight: 1 },
  { key: "notes", label: "Description", kind: "text", weight: 3 },
  { key: "private_notes", label: "Private Notes", kind: "text", weight: 2 },
];

/** Attached data outweighs any single summary column. */
const STREAM_WEIGHT = 14;
/** A denser recording is the better one to keep — 1s samples beat 10s ones. */
const DENSER_STREAM_WEIGHT = 6;
const DENSER_STREAM_SAMPLES = 600;
const LAP_WEIGHT = 3;
const PHOTO_WEIGHT = 3;

/** Zero-length rows still get a window so the ratio math stays finite. */
const MIN_SPAN_S = 60;
/** Below this share of the shorter activity the pair isn't worth surfacing. */
const MIN_OVERLAP = 0.5;

export interface DupeSide {
  id: number;
  name: string | null;
  modality: Modality;
  source: string;
  startTime: string;
  localDate: string;
  durationS: number | null;
  distanceM: number | null;
  hasStream: boolean;
  /** recorded stream samples — the density of the recording */
  samples: number;
  laps: number;
  photos: number;
  /** weighted completeness — higher means the richer recording */
  score: number;
}

export interface DupeFieldRow {
  key: string;
  label: string;
  kind: FieldKind;
  a: number | string | null;
  b: number | string | null;
}

export interface DupePair {
  key: string;
  a: DupeSide;
  b: DupeSide;
  /** the side we recommend keeping (the higher completeness score) */
  recommendKeep: number;
  /** overlap as a share of the shorter activity, 0–1 */
  overlap: number;
  /** seconds between the two start times */
  startDeltaS: number;
  confidence: "high" | "medium" | "low";
  /** only the columns where the two rows disagree */
  fields: DupeFieldRow[];
}

export const DISMISSED_KEY = "duplicates_dismissed";

/** Order-independent identity for a pair, so dismissals survive a re-scan. */
export function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function readDismissed(db: DB): Set<string> {
  const raw = getSetting(db, DISMISSED_KEY);
  if (!raw) return new Set();
  try {
    const arr: unknown = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export interface TimeSpan {
  start: number;
  end: number;
}

/** Start/end in epoch seconds. Elapsed wins over moving time — a paused watch
 * still occupies the wall clock. */
export function spanOf(r: {
  start_time: string;
  duration_s: number | null;
  elapsed_s: number | null;
}): TimeSpan {
  const start = Date.parse(r.start_time) / 1000;
  const len = Math.max(r.elapsed_s ?? 0, r.duration_s ?? 0, MIN_SPAN_S);
  return { start, end: start + len };
}

/** Overlapping seconds as a share of the shorter span (0 when disjoint). */
export function overlapRatio(x: TimeSpan, y: TimeSpan): number {
  const shared = Math.min(x.end, y.end) - Math.max(x.start, y.start);
  if (shared <= 0) return 0;
  const shorter = Math.min(x.end - x.start, y.end - y.start);
  return shorter <= 0 ? 0 : Math.min(1, shared / shorter);
}

function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

/** Weighted count of what a row actually carries. */
export function completeness(row: DupeScanRow): number {
  let score = 0;
  for (const f of DUPE_FIELDS) {
    if (hasValue((row as unknown as Record<string, unknown>)[f.key])) score += f.weight;
  }
  if (row.has_stream) score += STREAM_WEIGHT;
  if (row.sample_count >= DENSER_STREAM_SAMPLES) score += DENSER_STREAM_WEIGHT;
  if (row.lap_count > 1) score += LAP_WEIGHT;
  if (row.file_count > 0) score += PHOTO_WEIGHT;
  return score;
}

function side(row: DupeScanRow): DupeSide {
  return {
    id: row.id,
    name: row.name,
    modality: row.modality,
    source: row.source,
    startTime: row.start_time,
    localDate: row.local_date,
    durationS: row.duration_s,
    distanceM: row.distance_m,
    hasStream: !!row.has_stream,
    samples: row.sample_count,
    laps: row.lap_count,
    photos: row.file_count,
    score: completeness(row),
  };
}

function differingFields(a: DupeScanRow, b: DupeScanRow): DupeFieldRow[] {
  const out: DupeFieldRow[] = [];
  for (const f of DUPE_FIELDS) {
    const av = (a as unknown as Record<string, unknown>)[f.key] ?? null;
    const bv = (b as unknown as Record<string, unknown>)[f.key] ?? null;
    if (av === bv) continue;
    if (!hasValue(av) && !hasValue(bv)) continue;
    out.push({
      key: f.key,
      label: f.label,
      kind: f.kind,
      a: av as number | string | null,
      b: bv as number | string | null,
    });
  }
  return out;
}

function confidenceOf(overlap: number, a: DupeScanRow, b: DupeScanRow): DupePair["confidence"] {
  let c: DupePair["confidence"] =
    overlap >= 0.9 ? "high" : overlap >= 0.7 ? "medium" : "low";
  // Two very different distances over the same clock is more likely a nested
  // activity (a lap logged separately) than a straight duplicate.
  if (c === "high" && a.distance_m && b.distance_m) {
    const delta = Math.abs(a.distance_m - b.distance_m) / Math.max(a.distance_m, b.distance_m);
    if (delta > 0.15) c = "medium";
  }
  return c;
}

/**
 * Pair up activities whose recording windows overlap. Rows must be sorted by
 * start_time ascending; the scan is linear in practice because the inner loop
 * stops at the first row that starts after the outer row ends.
 */
export function findDuplicatePairs(
  rows: DupeScanRow[],
  dismissed: Set<string> = new Set(),
): DupePair[] {
  const pairs: DupePair[] = [];
  const spans = rows.map(spanOf);
  for (let i = 0; i < rows.length; i++) {
    if (!Number.isFinite(spans[i].start)) continue;
    for (let j = i + 1; j < rows.length; j++) {
      if (!Number.isFinite(spans[j].start)) continue;
      if (spans[j].start >= spans[i].end) break;
      const overlap = overlapRatio(spans[i], spans[j]);
      if (overlap < MIN_OVERLAP) continue;
      const key = pairKey(rows[i].id, rows[j].id);
      if (dismissed.has(key)) continue;
      const a = side(rows[i]);
      const b = side(rows[j]);
      pairs.push({
        key,
        a,
        b,
        recommendKeep: b.score > a.score ? b.id : a.id,
        overlap,
        startDeltaS: Math.abs(spans[j].start - spans[i].start),
        confidence: confidenceOf(overlap, rows[i], rows[j]),
        fields: differingFields(rows[i], rows[j]),
      });
    }
  }
  // Newest first — the pair you just created is the one you came to resolve.
  return pairs.sort((p, q) => q.a.startTime.localeCompare(p.a.startTime));
}

export function getDuplicatePairs(db: DB): DupePair[] {
  return findDuplicatePairs(listActivitiesForDupeScan(db), readDismissed(db));
}

/** Cheap enough to call on Home: one indexed scan, no stream JSON parsed. */
export function countDuplicatePairs(db: DB): number {
  return getDuplicatePairs(db).length;
}
