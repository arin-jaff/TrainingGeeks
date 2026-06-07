import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS } from "./catalog.js";
import { getPlan, planToPlanned, defaultStartDate, planEndDate } from "./apply.js";

test("catalog parsed all six plans with consistent week counts", () => {
  assert.equal(PLANS.length, 6);
  for (const p of PLANS) {
    assert.ok(p.weeks > 0, `${p.id} has weeks`);
    // Hal Higdon / tri plans are full 7-day weeks.
    assert.equal(p.workouts.length, p.weeks * 7, `${p.id} workout count`);
    const maxDay = Math.max(...p.workouts.map((w) => w.dayNum));
    assert.equal(maxDay, p.weeks * 7, `${p.id} last dayNum`);
  }
});

test("amounts parse into distance or duration", () => {
  const fiveK = getPlan("5K_NOV_01")!;
  const easyRun = fiveK.workouts.find((w) => w.type === "Easy Run")!;
  assert.equal(easyRun.modality, "run");
  assert.ok(easyRun.distanceM && easyRun.distanceM > 0, "mi parsed to meters");

  // A cross-training day maps to core and parses minutes.
  const cross = PLANS.flatMap((p) => p.workouts).find(
    (w) => w.modality === "core" && w.durationS,
  );
  assert.ok(cross && cross.durationS! > 0, "min parsed to seconds");
});

test("rest days carry no modality and are skipped on apply", () => {
  const plan = getPlan("5K_NOV_01")!;
  const rest = plan.workouts.filter((w) => w.modality === null);
  assert.ok(rest.length > 0);

  const planned = planToPlanned(plan, "2026-06-08"); // a Monday
  assert.equal(planned.length, plan.workouts.length - rest.length);
  assert.ok(planned.every((p) => p.source === "plan:5K_NOV_01"));
});

test("apply dates a workout by dayNum offset from the start Monday", () => {
  const plan = getPlan("5K_NOV_01")!;
  const start = "2026-06-08";
  const planned = planToPlanned(plan, start);
  // Day 2 (Tuesday, week 1) is the first non-rest day → start + 1 day.
  const first = planned[0];
  assert.equal(first.date, "2026-06-09");
  // End date spans the full plan.
  assert.equal(planEndDate(plan, start), "2026-08-02"); // 8 weeks - 1 day
});

test("defaultStartDate returns a Monday on/after today", () => {
  assert.equal(defaultStartDate("2026-06-08"), "2026-06-08"); // already Monday
  assert.equal(defaultStartDate("2026-06-10"), "2026-06-15"); // next Monday
});
