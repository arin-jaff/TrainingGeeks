import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { openDb } from "../db/client.js";
import { seed } from "../db/seed.js";
import {
  getActivity,
  getActivityStream,
  listDailyLoad,
} from "../db/repo.js";
import { importFitBuffer } from "./service.js";

const FIT_DIR = join(process.cwd(), "references", ".fit-files");
function sample(prefix: string): Buffer | null {
  if (!existsSync(FIT_DIR)) return null;
  const f = readdirSync(FIT_DIR).find((n) => n.toUpperCase().startsWith(prefix));
  return f ? readFileSync(join(FIT_DIR, f)) : null;
}

function freshDb() {
  const db = openDb(":memory:");
  seed(db);
  return db;
}

test("imports the three real files with computed metrics", (t) => {
  const run = sample("RUN");
  const bike = sample("BIKE");
  const swim = sample("SWIM");
  if (!run || !bike || !swim) return t.skip("missing FIT samples");

  const db = freshDb();
  const r1 = importFitBuffer(db, run, "manual", { storeRaw: false });
  const r2 = importFitBuffer(db, bike, "manual", { storeRaw: false });
  const r3 = importFitBuffer(db, swim, "manual", { storeRaw: false });

  assert.equal(r1.status, "imported");
  assert.equal(r1.modality, "run");
  assert.equal(r2.modality, "bike");
  assert.equal(r3.modality, "swim");

  const runAct = getActivity(db, r1.activityId)!;
  assert.ok(runAct.tss! > 0, `run tss ${runAct.tss}`);
  assert.equal(runAct.local_date.length, 10);

  const bikeAct = getActivity(db, r2.activityId)!;
  assert.ok(bikeAct.tss! > 0);
  assert.ok(bikeAct.np! > 0);

  const swimAct = getActivity(db, r3.activityId)!;
  assert.ok(swimAct.tss! > 0, `swim tss ${swimAct.tss}`);

  // Stream + peaks persisted.
  const stream = getActivityStream(db, r2.activityId)!;
  assert.ok(stream.power.length > 1000);
  const peakCount = db
    .prepare("SELECT count(*) c FROM peak WHERE activity_id = ?")
    .get(r2.activityId) as { c: number };
  assert.ok(peakCount.c > 0);

  // Fitness curves recomputed across all three.
  const all = listDailyLoad(db, "all", "2025-01-01", "2027-01-01");
  assert.ok(all.length > 0);
  assert.ok(all.some((d) => d.stress > 0));
});

test("re-importing the same file is a no-op duplicate", (t) => {
  const run = sample("RUN");
  if (!run) return t.skip("missing RUN sample");
  const db = freshDb();
  const first = importFitBuffer(db, run, "manual", { storeRaw: false });
  const second = importFitBuffer(db, run, "manual", { storeRaw: false });
  assert.equal(first.status, "imported");
  assert.equal(second.status, "duplicate");
  assert.equal(first.activityId, second.activityId);
  const count = db.prepare("SELECT count(*) c FROM activity").get() as {
    c: number;
  };
  assert.equal(count.c, 1);
});
