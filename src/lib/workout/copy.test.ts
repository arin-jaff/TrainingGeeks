import { test } from "node:test";
import assert from "node:assert/strict";
import { plannedCopyOf } from "./copy.js";
import type { ActivityRow, PlannedWorkoutRow } from "../db/types.js";

test("planned copy keeps the plan (incl. structure) on the new date, unlinked", () => {
  const row = {
    id: 7,
    modality: "run",
    date: "2026-06-01",
    name: "Tempo",
    description: "3x10",
    planned_duration_s: 3600,
    planned_distance_m: 12000,
    planned_tss: 70,
    completed_activity_id: 99,
    source: "intervals",
    structure: "[]",
    template_id: 3,
  } as PlannedWorkoutRow;
  const out = plannedCopyOf(row, "2026-06-08");
  assert.equal(out.date, "2026-06-08");
  assert.equal(out.name, "Tempo");
  assert.equal(out.planned_tss, 70);
  assert.equal(out.structure, "[]");
  assert.equal(out.template_id, 3);
  assert.equal(out.source, "manual");
  assert.ok(!("completed_activity_id" in out));
  assert.ok(!("id" in out));
});

test("activity copy becomes a plan from its actual numbers", () => {
  const row = {
    modality: "bike",
    name: "Long ride",
    notes: "easy",
    duration_s: 7200,
    distance_m: 60000,
    tss: 120,
    s3: null,
  } as ActivityRow;
  const out = plannedCopyOf(row, "2026-06-09");
  assert.deepEqual(out, {
    modality: "bike",
    date: "2026-06-09",
    name: "Long ride",
    description: "easy",
    planned_duration_s: 7200,
    planned_distance_m: 60000,
    planned_tss: 120,
    source: "manual",
  });
});

test("strength activity copy uses S³ as planned load and no distance", () => {
  const row = { modality: "lift", duration_s: 3600, distance_m: 0, tss: null, s3: 60 } as ActivityRow;
  const out = plannedCopyOf(row, "2026-06-09");
  assert.equal(out.planned_tss, 60);
  assert.equal(out.planned_distance_m, null);
});
