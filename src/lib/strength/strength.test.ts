import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStrengthSets } from "../fit/normalize";
import { exerciseDisplayName, splitCamel } from "./naming";

test("splitCamel turns FIT keys into display names", () => {
  assert.equal(splitCamel("benchPress"), "Bench Press");
  assert.equal(splitCamel("lateralRaise"), "Lateral Raise");
  assert.equal(splitCamel("tricepsExtension"), "Triceps Extension");
});

test("exerciseDisplayName respects override, then map, then splitter", () => {
  assert.equal(exerciseDisplayName("benchPress"), "Bench Press");
  assert.equal(exerciseDisplayName("unknown"), "Unnamed");
  assert.equal(exerciseDisplayName("benchPress", "Incline Bench"), "Incline Bench");
});

test("parseStrengthSets pairs active+rest and folds the rest duration", () => {
  const raw = [
    { setType: "active", repetitions: 10, duration: 42.3, weight: 0, category: ["benchPress", "unknown"] },
    { setType: "rest", duration: 113.6 },
    { setType: "active", repetitions: 6, duration: 40.5, weight: 60, category: ["shoulderPress"] },
    { setType: "rest", duration: 188.1 },
    { setType: "active", repetitions: 8, duration: 50, weight: 0, category: ["unknown", "unknown"] },
  ];
  const sets = parseStrengthSets(raw);
  assert.equal(sets.length, 3);
  assert.deepEqual(sets[0], {
    setIndex: 0,
    exerciseKey: "benchPress",
    reps: 10,
    durationS: 42.3,
    restS: 113.6,
    weightKg: null, // weight 0 → null
  });
  assert.equal(sets[1].exerciseKey, "shoulderPress");
  assert.equal(sets[1].weightKg, 60); // weighted set preserved
  assert.equal(sets[1].restS, 188.1);
  assert.equal(sets[2].exerciseKey, "unknown"); // all-unknown category
  assert.equal(sets[2].restS, null); // no trailing rest
});
