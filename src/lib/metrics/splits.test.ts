import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSplits, type SplitChannels } from "./splits.js";

// Build a steady stream: one sample per second, constant speed, distance ramps.
function steady(speedMps: number, seconds: number, hr: number): SplitChannels {
  const time: number[] = [];
  const distance: number[] = [];
  const hrArr: number[] = [];
  const power: number[] = [];
  const speed: number[] = [];
  for (let s = 0; s <= seconds; s++) {
    time.push(s);
    distance.push(s * speedMps);
    hrArr.push(hr);
    power.push(0);
    speed.push(speedMps);
  }
  return { time, distance, hr: hrArr, power, speed };
}

test("computeSplits cuts even 1000 m splits with correct pace and HR", () => {
  // 4 m/s for 700 s → 2800 m → two full 1 km splits + a 800 m partial.
  const ch = steady(4, 700, 150);
  const splits = computeSplits(ch, 1000);
  assert.equal(splits.length, 3);
  // full splits: 1000 m at 4 m/s = 250 s
  assert.equal(Math.round(splits[0].distanceM), 1000);
  assert.equal(Math.round(splits[0].durationS), 250);
  assert.ok(Math.abs(splits[0].avgSpeedMps! - 4) < 0.01);
  assert.equal(splits[0].avgHr, 150);
  // trailing partial split ~800 m
  assert.ok(splits[2].distanceM > 700 && splits[2].distanceM < 850);
});

test("computeSplits drops a negligible trailing sliver", () => {
  // exactly 2000 m → two full splits, no sliver
  const ch = steady(5, 400, 140); // 5 m/s * 400 s = 2000 m
  const splits = computeSplits(ch, 1000);
  assert.equal(splits.length, 2);
});

test("computeSplits averages HR across varying samples", () => {
  const ch = steady(4, 250, 0);
  // first half HR 140, second half 160
  for (let i = 0; i < ch.hr.length; i++) ch.hr[i] = i < ch.hr.length / 2 ? 140 : 160;
  const splits = computeSplits(ch, 1000);
  assert.equal(splits.length, 1);
  assert.ok(splits[0].avgHr! > 145 && splits[0].avgHr! < 155);
});

test("computeSplits handles empty / too-short input", () => {
  assert.deepEqual(computeSplits({ time: [], distance: [], hr: [], power: [], speed: [] }, 1000), []);
  assert.deepEqual(computeSplits(steady(4, 0, 150), 0), []);
});
