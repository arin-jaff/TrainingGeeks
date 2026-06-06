import { test } from "node:test";
import assert from "node:assert/strict";
import { mapIntervalsType, syncIntervals } from "./intervals.js";
import { openDb } from "../db/client.js";
import { seed } from "../db/seed.js";

test("intervals.icu activity types map to modalities", () => {
  assert.equal(mapIntervalsType("Run"), "run");
  assert.equal(mapIntervalsType("TrailRun"), "run");
  assert.equal(mapIntervalsType("Ride"), "bike");
  assert.equal(mapIntervalsType("VirtualRide"), "bike");
  assert.equal(mapIntervalsType("Swim"), "swim");
  assert.equal(mapIntervalsType("WeightTraining"), "lift");
  assert.equal(mapIntervalsType("Yoga"), "core");
  assert.equal(mapIntervalsType(undefined), "lift");
});

test("sync reports not-configured without throwing", async () => {
  const db = openDb(":memory:");
  seed(db);
  const result = await syncIntervals(db);
  assert.equal(result.imported, 0);
  assert.ok(result.errors.some((e) => e.includes("not configured")));
});
