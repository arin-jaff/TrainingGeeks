import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWorkoutWrites, type WorkoutInput } from "./save.js";

const base = (over: Partial<WorkoutInput>): WorkoutInput => ({
  date: "2026-06-05",
  modality: "run",
  name: "",
  description: "",
  planned: null,
  completed: null,
  ...over,
});

const emptyCompleted = {
  durationS: null,
  distanceM: null,
  avgSpeedMps: null,
  calories: null,
  elevationGainM: null,
  stress: null,
  intensityFactor: null,
  workKj: null,
  avgHr: null,
  maxHr: null,
  avgPower: null,
  maxPower: null,
  rpe: null,
};

test("planned-only produces a planned write and no activity", () => {
  const w = buildWorkoutWrites(
    base({ planned: { durationS: 3600, distanceM: 16093, tss: 80 } }),
  );
  assert.ok(w.planned);
  assert.equal(w.planned!.planned_duration_s, 3600);
  assert.equal(w.planned!.planned_tss, 80);
  assert.equal(w.activity, null);
});

test("completed cardio derives avg speed and routes stress to TSS", () => {
  const w = buildWorkoutWrites(
    base({
      modality: "run",
      completed: { ...emptyCompleted, durationS: 1800, distanceM: 5000, stress: 45 },
    }),
  );
  assert.ok(w.activity);
  assert.equal(w.activity!.source, "manual");
  assert.equal(w.activity!.local_date, "2026-06-05");
  assert.ok(Math.abs(w.activity!.avg_speed_mps! - 5000 / 1800) < 1e-9);
  assert.equal(w.activity!.tss, 45);
  assert.equal(w.activity!.s3, null);
});

test("strength completed derives S³ from duration + RPE, no TSS", () => {
  const w = buildWorkoutWrites(
    base({
      modality: "lift",
      completed: { ...emptyCompleted, durationS: 3600, rpe: 5, stress: 999 },
    }),
  );
  assert.ok(w.activity);
  assert.equal(w.activity!.tss, null); // strength ignores entered stress
  // 60 min × (1.5/1.5) = 60 at RPE 5
  assert.equal(w.activity!.s3, 60);
  assert.equal(w.activity!.rpe, 5);
  assert.equal(w.activity!.avg_power, null); // power not stored for strength
});

test("both planned and completed present yields both writes", () => {
  const w = buildWorkoutWrites(
    base({
      planned: { durationS: 3600, distanceM: null, tss: 70 },
      completed: { ...emptyCompleted, durationS: 3500, stress: 68 },
    }),
  );
  assert.ok(w.planned);
  assert.ok(w.activity);
});

test("explicit avg speed is preserved over derived", () => {
  const w = buildWorkoutWrites(
    base({
      completed: { ...emptyCompleted, durationS: 1800, distanceM: 5000, avgSpeedMps: 3 },
    }),
  );
  assert.equal(w.activity!.avg_speed_mps, 3);
});

test("empty form yields no writes", () => {
  const w = buildWorkoutWrites(base({ planned: { durationS: null, distanceM: null, tss: null } }));
  assert.equal(w.planned, null);
  assert.equal(w.activity, null);
});
