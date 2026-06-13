import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeFit } from "../fit/parse.js";
import {
  flatten,
  flatStepCount,
  validateWorkout,
  type RepeatBlock,
  type SimpleStep,
  type WorkoutDoc,
} from "./template.js";
import { estimateWorkout } from "./estimate.js";
import { summarizeWorkout } from "./summary.js";
import { encodeWorkoutFit, fitFilename } from "./fit.js";

// ---- fixtures ---------------------------------------------------------------

const step = (over: Partial<SimpleStep>): SimpleStep => ({
  kind: "step",
  id: over.id ?? Math.random().toString(36).slice(2),
  intensity: over.intensity ?? "active",
  durationKind: over.durationKind ?? "time",
  durationValue: over.durationValue ?? 600,
  target: over.target ?? { kind: "none" },
  ...over,
});

// Warm up 10:00 / 4× (800 m @ ~3:20/km + 2:00 jog) / Cool down 10:00
function fourByEight(): WorkoutDoc {
  const repeat: RepeatBlock = {
    kind: "repeat",
    id: "r1",
    count: 4,
    steps: [
      step({ id: "i1", intensity: "interval", durationKind: "distance", durationValue: 800, target: { kind: "pace", low: 4.8, high: 5.0 } }),
      step({ id: "i2", intensity: "recovery", durationKind: "time", durationValue: 120, target: { kind: "none" } }),
    ],
  };
  return {
    name: "4x800",
    modality: "run",
    steps: [
      step({ id: "wu", intensity: "warmup", durationKind: "time", durationValue: 600, target: { kind: "none" } }),
      repeat,
      step({ id: "cd", intensity: "cooldown", durationKind: "time", durationValue: 600, target: { kind: "none" } }),
    ],
  };
}

// ---- flatten ----------------------------------------------------------------

test("flatten expands repeats and records loop-back indices", () => {
  const flat = flatten(fourByEight().steps);
  // wu, i1, i2, repeat-marker, cd
  assert.equal(flat.length, 5);
  assert.deepEqual(
    flat.map((e) => e.type),
    ["step", "step", "step", "repeat", "step"],
  );
  const marker = flat[3];
  assert.equal(marker.type, "repeat");
  if (marker.type === "repeat") {
    assert.equal(marker.fromIndex, 1); // first inner step is flat index 1
    assert.equal(marker.count, 4);
  }
});

test("flatten skips degenerate repeats (empty body or count < 2)", () => {
  const doc: WorkoutDoc = {
    name: "x",
    modality: "run",
    steps: [
      { kind: "repeat", id: "r", count: 1, steps: [step({ id: "a" })] },
      { kind: "repeat", id: "r2", count: 3, steps: [] },
    ],
  };
  // count 1 → just its one inner step, no marker; empty body → nothing
  assert.equal(flatStepCount(doc.steps), 1);
});

// ---- validation -------------------------------------------------------------

test("validateWorkout accepts a well-formed workout", () => {
  assert.equal(validateWorkout(fourByEight()).ok, true);
});

test("validateWorkout flags missing name, empty steps, bad durations, bad ranges", () => {
  const noName = validateWorkout({ name: " ", modality: "run", steps: [] });
  assert.equal(noName.ok, false);
  assert.ok(noName.errors.some((e) => /name/i.test(e)));
  assert.ok(noName.errors.some((e) => /at least one step/i.test(e)));

  const badDur = validateWorkout({
    name: "z",
    modality: "run",
    steps: [step({ durationKind: "time", durationValue: 0 })],
  });
  assert.ok(badDur.errors.some((e) => /duration must be greater/i.test(e)));

  const badRange = validateWorkout({
    name: "z",
    modality: "run",
    steps: [step({ target: { kind: "power", low: 300, high: 200 } })],
  });
  assert.ok(badRange.errors.some((e) => /low is above high/i.test(e)));

  const badZone = validateWorkout({
    name: "z",
    modality: "bike",
    steps: [step({ target: { kind: "powerZone", low: 0 } })],
  });
  assert.ok(badZone.errors.some((e) => /zone must be/i.test(e)));
});

// ---- estimate ---------------------------------------------------------------

test("estimateWorkout sums duration, distance, and TSS across repeats", () => {
  const est = estimateWorkout(fourByEight(), { thresholdSpeed: 5.0 });
  // time: 600 (wu) + 4×120 (jog) + 600 (cd) = 1680s, plus 4×(800m intervals).
  // interval speed ~4.9 m/s → ~163s each → 4×163 = 653s. Total ~2333s.
  assert.ok(est.durationS! > 2200 && est.durationS! < 2500, `duration ${est.durationS}`);
  // distance: 4×800 intervals + jog/wu/cd distance at threshold-scaled speed.
  assert.ok(est.distanceM! > 3200, `distance ${est.distanceM}`);
  assert.ok(est.tss! > 0, `tss ${est.tss}`);
});

test("estimateWorkout reports only duration for strength", () => {
  const est = estimateWorkout({
    name: "lift",
    modality: "lift",
    steps: [step({ durationKind: "time", durationValue: 1800, target: { kind: "none" } })],
  });
  assert.equal(est.durationS, 1800);
  assert.equal(est.distanceM, null);
  assert.equal(est.tss, null);
});

// ---- summary ----------------------------------------------------------------

test("summarizeWorkout renders a compact one-liner", () => {
  const s = summarizeWorkout(fourByEight().steps, "metric", "run");
  assert.match(s, /Warm up 10:00/);
  assert.match(s, /4× \(800 m @ /);
  assert.match(s, /\/km/);
  assert.match(s, /Cool down 10:00/);
});

// ---- FIT encode → decode round-trip ----------------------------------------

test("encodeWorkoutFit produces a decodable FIT workout with correct steps", () => {
  const bytes = encodeWorkoutFit(fourByEight());
  const { messages, errors } = decodeFit(bytes);
  assert.deepEqual(errors, []);

  assert.equal(messages.fileIdMesgs?.[0]?.type, "workout");
  const wkt = messages.workoutMesgs?.[0] as Record<string, unknown>;
  assert.equal(wkt.wktName, "4x800");
  assert.equal(wkt.sport, "running");
  assert.equal(wkt.numValidSteps, 5);

  const steps = messages.workoutStepMesgs as Record<string, unknown>[];
  assert.equal(steps.length, 5);

  // Warmup: time 600s, open target.
  assert.equal(steps[0].intensity, "warmup");
  assert.equal(steps[0].durationTime, 600);
  assert.equal(steps[0].targetType, "open");

  // Interval: distance 800m, speed target 4.8–5.0 m/s.
  assert.equal(steps[1].intensity, "interval");
  assert.equal(steps[1].durationDistance, 800);
  assert.equal(steps[1].targetType, "speed");
  assert.equal(steps[1].customTargetSpeedLow, 4.8);
  assert.equal(steps[1].customTargetSpeedHigh, 5.0);

  // Repeat marker loops back to the first interval (index 1), 4 times.
  assert.equal(steps[3].durationType, "repeatUntilStepsCmplt");
  assert.equal(steps[3].durationStep, 1);
  assert.equal(steps[3].repeatSteps, 4);
});

test("encodeWorkoutFit maps HR and power targets with the right offsets", () => {
  const doc: WorkoutDoc = {
    name: "targets",
    modality: "bike",
    steps: [
      step({ id: "p", durationKind: "time", durationValue: 300, target: { kind: "power", low: 200, high: 240 } }),
      step({ id: "h", durationKind: "time", durationValue: 300, target: { kind: "hr", low: 150, high: 160 } }),
      step({ id: "z", durationKind: "time", durationValue: 300, target: { kind: "powerZone", low: 3 } }),
    ],
  };
  const { messages } = decodeFit(encodeWorkoutFit(doc));
  const steps = messages.workoutStepMesgs as Record<string, unknown>[];
  // Power watts are stored as watts + 1000 (the FIT convention the watch reads
  // back as absolute watts); the decoder returns that raw stored value.
  assert.equal(steps[0].targetType, "power");
  assert.equal(steps[0].customTargetPowerLow, 1200);
  assert.equal(steps[0].customTargetPowerHigh, 1240);
  // HR bpm are stored as bpm + 100 (>100 means absolute bpm to the watch).
  assert.equal(steps[1].targetType, "heartRate");
  assert.equal(steps[1].customTargetHeartRateLow, 250);
  assert.equal(steps[1].customTargetHeartRateHigh, 260);
  // power zone → targetValue.
  assert.equal(steps[2].targetPowerZone, 3);
});

test("encodeWorkoutFit rejects an empty workout", () => {
  assert.throws(() => encodeWorkoutFit({ name: "empty", modality: "run", steps: [] }));
});

test("fitFilename sanitizes names", () => {
  assert.equal(fitFilename("4×800 @ 5K!"), "4800_5K.fit");
  assert.equal(fitFilename("  "), "workout.fit");
});
