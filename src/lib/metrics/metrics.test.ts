import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { computeCardioMetrics } from "./cardio.js";
import { normalizedValue, resampleTo1Hz, movingAverage } from "./series.js";
import { gradeFactor } from "./grade.js";
import { durationPeaks, distancePeaks } from "./peaks.js";
import { normalizeFit } from "../fit/normalize.js";
import type { Modality } from "../db/types.js";
import type { NormalizedActivity, StreamChannels } from "../fit/types.js";

const FIT_DIR = join(process.cwd(), "references", ".fit-files");
function sample(prefix: string): Buffer | null {
  if (!existsSync(FIT_DIR)) return null;
  const f = readdirSync(FIT_DIR).find((n) => n.toUpperCase().startsWith(prefix));
  return f ? readFileSync(join(FIT_DIR, f)) : null;
}

function emptyChannels(): StreamChannels {
  return {
    time: [],
    lat: [],
    lng: [],
    alt: [],
    hr: [],
    power: [],
    cadence: [],
    speed: [],
    distance: [],
    temp: [],
  };
}

function synthetic(
  modality: Modality,
  durationS: number,
  fill: Partial<Record<keyof StreamChannels, number>>,
): NormalizedActivity {
  const ch = emptyChannels();
  for (let t = 0; t < durationS; t++) {
    ch.time.push(t);
    ch.power.push(fill.power ?? null);
    ch.speed.push(fill.speed ?? null);
    ch.hr.push(fill.hr ?? null);
    ch.distance.push(fill.speed ? fill.speed * t : null);
    ch.alt.push(0);
    ch.lat.push(null);
    ch.lng.push(null);
    ch.cadence.push(null);
    ch.temp.push(null);
  }
  return {
    sport: modality,
    subSport: null,
    modality,
    startTime: "2026-01-01T00:00:00.000Z",
    fitHash: "synthetic",
    summary: {
      durationS,
      elapsedS: durationS,
      distanceM: fill.speed ? fill.speed * durationS : null,
      elevationGainM: 0,
      avgHr: fill.hr ?? null,
      maxHr: fill.hr ?? null,
      avgPower: fill.power ?? null,
      maxPower: fill.power ?? null,
      np: null,
      avgSpeedMps: fill.speed ?? null,
      maxSpeedMps: fill.speed ?? null,
      avgCadence: null,
      maxCadence: null,
      calories: null,
      kj: null,
    },
    channels: ch,
    laps: [],
    sessions: [],
  };
}

// ---- Series primitives ----

test("normalizedValue of a constant series equals the constant", () => {
  const series = new Array(600).fill(200);
  assert.equal(Math.round(normalizedValue(series)!), 200);
});

test("moving average smooths and resample builds a 1Hz grid", () => {
  const ma = movingAverage([0, 0, 0, 4], 4);
  assert.equal(ma[3], 1); // (0+0+0+4)/4
  const grid = resampleTo1Hz([0, 2, 4], [10, null, 20]);
  assert.equal(grid.length, 5);
  assert.equal(grid[0], 10);
  assert.equal(grid[4], 20);
});

test("grade factor: flat=1, uphill>1, downhill<1", () => {
  assert.equal(Math.round(gradeFactor(0) * 1000) / 1000, 1);
  assert.ok(gradeFactor(0.1) > 1.2);
  assert.ok(gradeFactor(-0.1) < 1);
});

// ---- TSS formula anchors ----

test("one hour at FTP yields TSS 100 and IF 1.0 (power)", () => {
  const a = synthetic("bike", 3600, { power: 250, hr: 150 });
  const m = computeCardioMetrics(a, { ftp: 250, thresholdHr: 165 });
  assert.equal(m.tssMethod, "power");
  assert.equal(m.np, 250);
  assert.equal(m.intensityFactor, 1);
  assert.equal(m.variabilityIndex, 1);
  assert.ok(Math.abs(m.tss! - 100) < 0.5, `tss ${m.tss}`);
  // Work = 250 W × 3600 s / 1000 = 900 kJ
  assert.equal(m.work, 900);
});

test("half hour at threshold pace yields ~50 TSS (pace)", () => {
  const speed = 4.0;
  const a = synthetic("run", 1800, { speed, hr: 160 });
  const m = computeCardioMetrics(a, { thresholdSpeed: speed, thresholdHr: 170 });
  assert.equal(m.tssMethod, "pace");
  assert.ok(Math.abs(m.intensityFactor! - 1) < 0.02, `if ${m.intensityFactor}`);
  assert.ok(Math.abs(m.tss! - 50) < 1.5, `tss ${m.tss}`);
});

test("falls back to hrTSS when no power/pace threshold", () => {
  const a = synthetic("bike", 3600, { hr: 160 });
  const m = computeCardioMetrics(a, { thresholdHr: 160 });
  assert.equal(m.tssMethod, "hr");
  assert.ok(Math.abs(m.tss! - 100) < 1, `tss ${m.tss}`);
});

test("strength modality returns no cardio metrics", () => {
  const a = synthetic("lift", 1800, { hr: 120 });
  const m = computeCardioMetrics(a, { thresholdHr: 160 });
  assert.equal(m.tss, null);
  assert.equal(m.tssMethod, null);
});

// ---- Peak curves ----

test("durationPeaks finds the best window", () => {
  const series = new Array(120).fill(100);
  for (let i = 30; i < 40; i++) series[i] = 400; // 10s spike
  const peaks = durationPeaks(series, [1, 10, 60]);
  assert.equal(peaks.find((p) => p.window === 1)!.value, 400);
  assert.equal(peaks.find((p) => p.window === 10)!.value, 400);
  assert.ok(peaks.find((p) => p.window === 60)!.value < 200);
});

test("distancePeaks recovers constant pace", () => {
  const time: number[] = [];
  const dist: number[] = [];
  for (let t = 0; t <= 1000; t++) {
    time.push(t);
    dist.push(t * 5); // 5 m/s
  }
  const peaks = distancePeaks(time, dist, [400, 1000]);
  assert.ok(Math.abs(peaks.find((p) => p.window === 400)!.speed - 5) < 0.05);
});

// ---- Real files ----

test("real bike: computed NP tracks device NP, TSS reasonable", (t) => {
  const buf = sample("BIKE");
  if (!buf) return t.skip("no BIKE sample");
  const a = normalizeFit(buf);
  const m = computeCardioMetrics(a, { ftp: 250, thresholdHr: 165 });
  assert.equal(m.tssMethod, "power");
  // device NP was 302; our algorithm should be within ~8%
  assert.ok(Math.abs(m.np! - 302) / 302 < 0.08, `np ${m.np}`);
  assert.ok(m.variabilityIndex! > 1.05, `vi ${m.variabilityIndex}`);
  assert.ok(m.tss! > 50 && m.tss! < 130, `tss ${m.tss}`);
});

test("real run: pace-based TSS in a sane range", (t) => {
  const buf = sample("RUN");
  if (!buf) return t.skip("no RUN sample");
  const a = normalizeFit(buf);
  const m = computeCardioMetrics(a, {
    thresholdSpeed: 1609.34 / 381,
    thresholdHr: 180,
  });
  assert.equal(m.tssMethod, "pace");
  assert.ok(m.ngp! > 3 && m.ngp! < 6, `ngp ${m.ngp}`);
  assert.ok(m.tss! > 60 && m.tss! < 180, `tss ${m.tss}`);
  assert.ok(m.efficiencyFactor! > 0, `ef ${m.efficiencyFactor}`);
});
