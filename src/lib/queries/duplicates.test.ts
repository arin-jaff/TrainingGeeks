import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../db/client.js";
import {
  insertActivity,
  insertActivityFile,
  mergeActivityInto,
  setActivityStream,
  setSetting,
  getActivity,
  listActivityFiles,
  getActivityStream,
  type DupeScanRow,
} from "../db/repo.js";
import {
  completeness,
  DISMISSED_KEY,
  findDuplicatePairs,
  getDuplicatePairs,
  overlapRatio,
  pairKey,
  spanOf,
} from "./duplicates.js";

/** Mirrors what the dismiss server action writes. */
function dismiss(db: ReturnType<typeof openDb>, key: string): void {
  setSetting(db, DISMISSED_KEY, JSON.stringify([key]));
}

function row(over: Partial<DupeScanRow> & { id: number; start_time: string }): DupeScanRow {
  return {
    modality: "run",
    sport_detail: null,
    source: "manual",
    fit_hash: null,
    raw_path: null,
    local_date: over.start_time.slice(0, 10),
    timezone: "UTC",
    name: null,
    notes: null,
    private_notes: null,
    duration_s: 3600,
    elapsed_s: 3600,
    distance_m: 16000,
    elevation_gain_m: null,
    avg_hr: null,
    max_hr: null,
    avg_power: null,
    max_power: null,
    np: null,
    avg_speed_mps: null,
    max_speed_mps: null,
    avg_cadence: null,
    max_cadence: null,
    calories: null,
    kj: null,
    tss: null,
    s3: null,
    intensity_factor: null,
    variability_index: null,
    efficiency_factor: null,
    decoupling: null,
    rpe: null,
    route_polyline: null,
    metrics_version: 1,
    created_at: "",
    updated_at: "",
    has_stream: 0,
    sample_count: 0,
    lap_count: 0,
    file_count: 0,
    ...over,
  } as DupeScanRow;
}

test("spanOf uses elapsed time and gives zero-length rows a window", () => {
  const s = spanOf({
    start_time: "2026-06-01T12:00:00.000Z",
    duration_s: 1800,
    elapsed_s: 2000,
  });
  assert.equal(s.end - s.start, 2000);
  const empty = spanOf({
    start_time: "2026-06-01T12:00:00.000Z",
    duration_s: null,
    elapsed_s: null,
  });
  assert.equal(empty.end - empty.start, 60);
});

test("overlapRatio measures against the shorter activity", () => {
  const long = { start: 0, end: 3600 };
  const short = { start: 1800, end: 3600 };
  assert.equal(overlapRatio(long, short), 1);
  assert.equal(overlapRatio({ start: 0, end: 100 }, { start: 200, end: 300 }), 0);
  assert.equal(overlapRatio({ start: 0, end: 100 }, { start: 50, end: 150 }), 0.5);
});

test("findDuplicatePairs flags a watch/phone pair and recommends the richer row", () => {
  const rows = [
    // phone: same session, slightly short, no HR and no stream
    row({ id: 1, start_time: "2026-06-01T12:00:00.000Z", distance_m: 16093 }),
    // watch: starts 30s later, full data
    row({
      id: 2,
      start_time: "2026-06-01T12:00:30.000Z",
      distance_m: 16575,
      avg_hr: 152,
      max_hr: 178,
      has_stream: 1,
      sample_count: 3600,
      lap_count: 8,
    }),
  ];
  const pairs = findDuplicatePairs(rows);
  assert.equal(pairs.length, 1);
  const p = pairs[0];
  assert.equal(p.key, "1-2");
  assert.equal(p.recommendKeep, 2, "the row with HR + stream + laps wins");
  assert.ok(p.overlap > 0.98, `overlap ${p.overlap}`);
  assert.equal(p.startDeltaS, 30);
  assert.equal(p.confidence, "high");
  const keys = p.fields.map((f) => f.key);
  assert.ok(keys.includes("distance_m"));
  assert.ok(keys.includes("avg_hr"), "a field only one side has is offered for merge");
  assert.ok(!keys.includes("duration_s"), "identical fields are not listed");
});

test("findDuplicatePairs ignores back-to-back and dismissed activities", () => {
  const backToBack = [
    row({ id: 1, start_time: "2026-06-01T12:00:00.000Z" }),
    row({ id: 2, start_time: "2026-06-01T13:00:01.000Z" }),
  ];
  assert.deepEqual(findDuplicatePairs(backToBack), []);

  const overlapping = [
    row({ id: 3, start_time: "2026-06-01T12:00:00.000Z" }),
    row({ id: 4, start_time: "2026-06-01T12:05:00.000Z" }),
  ];
  assert.equal(findDuplicatePairs(overlapping).length, 1);
  assert.deepEqual(
    findDuplicatePairs(overlapping, new Set([pairKey(4, 3)])),
    [],
    "dismissal is order-independent",
  );
});

test("completeness ranks attached data above lone summary columns", () => {
  const bare = row({ id: 1, start_time: "2026-06-01T12:00:00.000Z" });
  const rich = row({
    id: 2,
    start_time: "2026-06-01T12:00:00.000Z",
    has_stream: 1,
    sample_count: 3600,
    lap_count: 5,
  });
  assert.ok(completeness(rich) > completeness(bare));
});

test("mergeActivityInto fills gaps, adopts orphaned data, and deletes the duplicate", () => {
  const db = openDb(":memory:");
  const keep = insertActivity(db, {
    modality: "run",
    start_time: "2026-06-01T12:00:00.000Z",
    local_date: "2026-06-01",
    distance_m: 16000,
    duration_s: 3600,
    avg_hr: null,
    notes: null,
  });
  const drop = insertActivity(db, {
    modality: "run",
    start_time: "2026-06-01T12:00:30.000Z",
    local_date: "2026-06-01",
    distance_m: 16093,
    duration_s: 3550,
    avg_hr: 152,
    notes: "felt good",
  });
  setActivityStream(db, drop, { time: [0, 1], hr: [150, 154] });
  insertActivityFile(db, {
    activity_id: drop,
    filename: "summit.jpg",
    mime: "image/jpeg",
    size: 10,
    stored_path: "data/uploads/summit.jpg",
    is_image: 1,
  });

  const ok = mergeActivityInto(db, keep, drop, ["avg_hr", "notes", "id", "'; DROP TABLE activity--"]);
  assert.equal(ok, true);

  const merged = getActivity(db, keep);
  assert.equal(merged?.avg_hr, 152, "missing field pulled from the duplicate");
  assert.equal(merged?.notes, "felt good");
  assert.equal(merged?.distance_m, 16000, "unselected fields keep the survivor's value");
  assert.equal(merged?.id, keep, "id is never overwritten");
  assert.equal(getActivity(db, drop), undefined, "the duplicate is gone");
  assert.equal(listActivityFiles(db, keep).length, 1, "photos follow the survivor");
  assert.ok(getActivityStream(db, keep), "the only stream is adopted");
});

test("getDuplicatePairs reads a real database end to end", () => {
  const db = openDb(":memory:");
  const phone = insertActivity(db, {
    modality: "run",
    start_time: "2026-06-01T12:00:00.000Z",
    local_date: "2026-06-01",
    duration_s: 3600,
    elapsed_s: 3600,
    distance_m: 16000,
  });
  const watch = insertActivity(db, {
    modality: "run",
    start_time: "2026-06-01T12:00:30.000Z",
    local_date: "2026-06-01",
    duration_s: 3550,
    elapsed_s: 3600,
    distance_m: 16093,
    avg_hr: 152,
  });
  setActivityStream(db, watch, { time: [0, 1, 2], hr: [150, 151, 152] });
  insertActivity(db, {
    modality: "bike",
    start_time: "2026-06-02T12:00:00.000Z",
    local_date: "2026-06-02",
    duration_s: 3600,
    elapsed_s: 3600,
  });

  const pairs = getDuplicatePairs(db);
  assert.equal(pairs.length, 1, "the unrelated next-day ride is not paired");
  assert.equal(pairs[0].recommendKeep, watch);
  assert.equal(pairs[0].key, pairKey(phone, watch));
  assert.ok(
    pairs[0].fields.some((f) => f.key === "avg_hr"),
    "the field only the watch has is offered",
  );

  dismiss(db, pairKey(phone, watch));
  assert.deepEqual(getDuplicatePairs(db), [], "a dismissed pair stays hidden");
});

test("mergeActivityInto keeps the survivor's own stream", () => {
  const db = openDb(":memory:");
  const keep = insertActivity(db, {
    modality: "run",
    start_time: "2026-06-01T12:00:00.000Z",
    local_date: "2026-06-01",
  });
  const drop = insertActivity(db, {
    modality: "run",
    start_time: "2026-06-01T12:00:00.000Z",
    local_date: "2026-06-01",
  });
  setActivityStream(db, keep, { time: [0, 1], hr: [100, 101] });
  setActivityStream(db, drop, { time: [0, 1], hr: [200, 201] });

  assert.equal(mergeActivityInto(db, keep, drop, []), true);
  assert.deepEqual(getActivityStream(db, keep)?.hr, [100, 101]);
  assert.equal(mergeActivityInto(db, keep, keep, []), false, "a row cannot absorb itself");
});
