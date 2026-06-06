import { test } from "node:test";
import assert from "node:assert/strict";
import { computeS3, effortMultiplier, DEFAULT_RPE } from "../metrics/strength.js";
import { computeFitnessSeries } from "./ewma.js";
import { recomputeFitness } from "./recompute.js";
import { openDb } from "../db/client.js";
import { insertActivity, listDailyLoad } from "../db/repo.js";

// ---- S³ ----

test("S³ effort multiplier maps RPE to [1.0, 2.0] with default 1.5", () => {
  assert.equal(effortMultiplier(DEFAULT_RPE), 1.5);
  assert.equal(effortMultiplier(10), 2.0);
  assert.equal(effortMultiplier(12), 2.0); // clamp high
  assert.equal(effortMultiplier(1), 1.1);
  assert.equal(effortMultiplier(0), 1.1); // clamp low to 1
});

test("S³ anchors: 60 min at RPE 5 = 60", () => {
  assert.equal(computeS3(3600, 5), 60);
  assert.equal(computeS3(3600), 60); // default RPE
  assert.equal(computeS3(3600, 10), 80);
  assert.equal(computeS3(1800, 8), 36);
  assert.equal(computeS3(0, 5), 0);
});

// ---- EWMA fitness ----

test("constant load: ATL leads CTL, both rise from zero", () => {
  const days = Array.from({ length: 100 }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, "0")}`.slice(0, 10),
    stress: 100,
  }));
  // dates only need to be ordered/consecutive for the math; reuse simple labels
  const series = computeFitnessSeries(
    days.map((d, i) => ({ date: String(i), stress: 100 })),
  );
  const last = series[series.length - 1];
  assert.ok(last.ctl > 80 && last.ctl < 100, `ctl ${last.ctl}`);
  assert.ok(last.atl > 99, `atl ${last.atl}`);
  assert.ok(last.atl > last.ctl); // fatigue accrues faster
  assert.equal(series[0].tsb, 0); // first day uses seed (0-0)
});

test("rest after load: fatigue decays faster than fitness (form rises)", () => {
  const input = [
    ...Array.from({ length: 20 }, (_, i) => ({ date: String(i), stress: 100 })),
    ...Array.from({ length: 20 }, (_, i) => ({ date: String(20 + i), stress: 0 })),
  ];
  const series = computeFitnessSeries(input);
  const last = series[series.length - 1];
  assert.ok(last.tsb > 0, `form should be positive after rest, got ${last.tsb}`);
  assert.ok(last.ctl > last.atl);
});

// ---- DB recompute ----

test("recomputeFitness rolls cardio TSS and strength S³ into curves", () => {
  const db = openDb(":memory:");
  insertActivity(db, {
    modality: "run",
    start_time: "2026-06-01T12:00:00.000Z",
    local_date: "2026-06-01",
    tss: 100,
  });
  insertActivity(db, {
    modality: "lift",
    start_time: "2026-06-01T18:00:00.000Z",
    local_date: "2026-06-01",
    s3: 60,
  });
  recomputeFitness(db, "2026-06-05");

  const all = listDailyLoad(db, "all", "2026-06-01", "2026-06-05");
  assert.equal(all.length, 5); // gap-filled through 'today'
  assert.equal(all[0].stress, 160); // 100 TSS + 60 S³
  assert.ok(all[0].ctl > 0 && all[0].atl > 0);

  const run = listDailyLoad(db, "run", "2026-06-01", "2026-06-01")[0];
  const strength = listDailyLoad(db, "strength", "2026-06-01", "2026-06-01")[0];
  assert.equal(run.stress, 100);
  assert.equal(strength.stress, 60);
  // later days decay toward zero with no new stress
  assert.ok(all[4].stress === 0 && all[4].atl < all[0].atl + 1);
});

test("recomputeFitness is idempotent", () => {
  const db = openDb(":memory:");
  insertActivity(db, {
    modality: "bike",
    start_time: "2026-06-01T12:00:00.000Z",
    local_date: "2026-06-01",
    tss: 80,
  });
  recomputeFitness(db, "2026-06-03");
  recomputeFitness(db, "2026-06-03");
  const rows = listDailyLoad(db, "all", "2026-06-01", "2026-06-03");
  assert.equal(rows.length, 3); // no duplicates
  assert.equal(rows[0].stress, 80);
});
