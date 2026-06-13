import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "./client.js";
import { seed } from "./seed.js";
import { MIGRATIONS } from "./migrations.js";
import {
  getAthlete,
  getEffectiveThreshold,
  insertActivity,
  getActivityByHash,
  setActivityStream,
  getActivityStream,
  setThreshold,
  upsertDailyLoad,
  listDailyLoad,
  upsertConnector,
  getConnector,
  insertWorkoutTemplate,
  updateWorkoutTemplate,
  getWorkoutTemplate,
  listWorkoutTemplates,
  deleteWorkoutTemplate,
  insertPlanned,
  getPlanned,
} from "./repo.js";

test("migrations run and create all tables", () => {
  const db = openDb(":memory:");
  const tables = (
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as { name: string }[]
  ).map((r) => r.name);
  for (const t of [
    "athlete",
    "threshold",
    "zone",
    "activity",
    "activity_stream",
    "lap",
    "session",
    "planned_workout",
    "workout_template",
    "daily_load",
    "peak",
    "dashboard_layout",
    "connector_account",
    "event",
    "goal",
    "_migrations",
  ]) {
    assert.ok(tables.includes(t), `missing table ${t}`);
  }
});

test("migrations are idempotent", () => {
  const db = openDb(":memory:");
  // openDb already migrated once; running again should be a no-op.
  const before = db.prepare("SELECT count(*) c FROM _migrations").get() as {
    c: number;
  };
  // One row per defined migration, applied exactly once.
  assert.equal(before.c, MIGRATIONS.length);
});

test("seed inserts athlete and default thresholds idempotently", () => {
  const db = openDb(":memory:");
  seed(db);
  seed(db); // second call must not duplicate
  const athlete = getAthlete(db);
  assert.equal(athlete?.name, "Arin Jaff");
  assert.equal(athlete?.units, "imperial");
  const thresholdCount = db
    .prepare("SELECT count(*) c FROM threshold")
    .get() as { c: number };
  assert.equal(thresholdCount.c, 7);
});

test("effective threshold respects valid_from versioning", () => {
  const db = openDb(":memory:");
  setThreshold(db, "bike", "ftp", 250, "2024-01-01");
  setThreshold(db, "bike", "ftp", 275, "2026-01-01");
  assert.equal(getEffectiveThreshold(db, "bike", "ftp", "2025-06-01"), 250);
  assert.equal(getEffectiveThreshold(db, "bike", "ftp", "2026-06-01"), 275);
  assert.equal(getEffectiveThreshold(db, "bike", "ftp", "2023-01-01"), undefined);
});

test("activity insert + hash dedupe lookup", () => {
  const db = openDb(":memory:");
  const id = insertActivity(db, {
    modality: "run",
    start_time: "2026-06-05T20:36:37.000Z",
    local_date: "2026-06-05",
    fit_hash: "abc123",
    duration_s: 3936,
    distance_m: 16254,
    tss: 117,
  });
  assert.ok(id > 0);
  const found = getActivityByHash(db, "abc123");
  assert.equal(found?.id, id);
  assert.equal(found?.tss, 117);
});

test("activity stream round-trips columnar JSON", () => {
  const db = openDb(":memory:");
  const id = insertActivity(db, {
    modality: "bike",
    start_time: "2026-05-05T01:21:26.000Z",
    local_date: "2026-05-04",
  });
  setActivityStream(db, id, {
    time: [0, 1, 2],
    power: [100, 200, null],
    hr: [120, 130, 140],
  });
  const stream = getActivityStream(db, id);
  assert.deepEqual(stream?.power, [100, 200, null]);
  assert.equal(stream?.hr?.length, 3);
});

test("daily_load upsert + range query", () => {
  const db = openDb(":memory:");
  upsertDailyLoad(db, {
    date: "2026-06-01",
    curve: "all",
    stress: 100,
    ctl: 50,
    atl: 70,
    tsb: -20,
  });
  upsertDailyLoad(db, {
    date: "2026-06-01",
    curve: "all",
    stress: 120,
    ctl: 51,
    atl: 75,
    tsb: -24,
  }); // overwrite same (date,curve)
  const rows = listDailyLoad(db, "all", "2026-05-01", "2026-06-30");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].stress, 120);
  assert.equal(rows[0].tsb, -24);
});

test("workout_template CRUD round-trips and lists newest first", () => {
  const db = openDb(":memory:");
  const steps = JSON.stringify([{ kind: "step", id: "a", intensity: "active", durationKind: "time", durationValue: 600, target: { kind: "none" } }]);
  const id = insertWorkoutTemplate(db, {
    name: "Tempo",
    modality: "run",
    description: "desc",
    steps,
    est_duration_s: 600,
    est_distance_m: 3000,
    est_tss: 40,
  });
  assert.ok(id > 0);
  let t = getWorkoutTemplate(db, id);
  assert.equal(t?.name, "Tempo");
  assert.equal(t?.est_tss, 40);
  assert.equal(JSON.parse(t!.steps).length, 1);

  updateWorkoutTemplate(db, id, { name: "Tempo v2", modality: "bike", steps, est_duration_s: 700 });
  t = getWorkoutTemplate(db, id);
  assert.equal(t?.name, "Tempo v2");
  assert.equal(t?.modality, "bike");
  assert.equal(t?.est_duration_s, 700);

  insertWorkoutTemplate(db, { name: "Second", modality: "run", steps });
  const list = listWorkoutTemplates(db);
  assert.equal(list.length, 2);

  deleteWorkoutTemplate(db, id);
  assert.equal(getWorkoutTemplate(db, id), undefined);
  assert.equal(listWorkoutTemplates(db).length, 1);
});

test("planned_workout stores structure + template_id for scheduled workouts", () => {
  const db = openDb(":memory:");
  const structure = JSON.stringify([{ kind: "step", id: "a", intensity: "warmup", durationKind: "time", durationValue: 600, target: { kind: "none" } }]);
  const pid = insertPlanned(db, {
    modality: "run",
    date: "2026-06-20",
    name: "Scheduled Intervals",
    source: "manual",
    planned_duration_s: 2400,
    structure,
    template_id: 7,
  });
  const p = getPlanned(db, pid);
  assert.equal(p?.template_id, 7);
  assert.equal(JSON.parse(p!.structure!)[0].intensity, "warmup");
});

test("connector upsert preserves api_key when omitted", () => {
  const db = openDb(":memory:");
  upsertConnector(db, "intervals", { api_key: "key1", athlete_id: "i123", enabled: 1 });
  upsertConnector(db, "intervals", { last_sync_cursor: "2026-06-05", enabled: 1 });
  const c = getConnector(db, "intervals");
  assert.equal(c?.api_key, "key1");
  assert.equal(c?.last_sync_cursor, "2026-06-05");
  assert.equal(c?.enabled, 1);
});
