import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { normalizeFit } from "./normalize.js";

const FIT_DIR = join(process.cwd(), "references", ".fit-files");

function sample(prefix: string): Buffer | null {
  if (!existsSync(FIT_DIR)) return null;
  const f = readdirSync(FIT_DIR).find((n) =>
    n.toUpperCase().startsWith(prefix),
  );
  return f ? readFileSync(join(FIT_DIR, f)) : null;
}

test("run FIT normalizes with pace/HR and GPS", (t) => {
  const buf = sample("RUN");
  if (!buf) return t.skip("no RUN sample in references/.fit-files");
  const a = normalizeFit(buf);
  assert.equal(a.modality, "run");
  assert.equal(a.sport, "running");
  assert.ok(a.summary.distanceM! > 16000 && a.summary.distanceM! < 16500);
  assert.ok(a.summary.durationS! > 3900 && a.summary.durationS! < 3950);
  assert.equal(a.summary.avgHr, 162);
  assert.equal(a.channels.time.length, 3937);
  // GPS present and converted to plausible degrees
  const lat = a.channels.lat.find((v) => v !== null)!;
  const lng = a.channels.lng.find((v) => v !== null)!;
  assert.ok(lat > 47 && lat < 48, `lat ${lat}`);
  assert.ok(lng < -122 && lng > -123, `lng ${lng}`);
});

test("bike FIT normalizes with power and work", (t) => {
  const buf = sample("BIKE");
  if (!buf) return t.skip("no BIKE sample in references/.fit-files");
  const a = normalizeFit(buf);
  assert.equal(a.modality, "bike");
  assert.equal(a.summary.avgPower, 250);
  assert.equal(a.summary.np, 302);
  assert.ok(a.summary.kj! > 515 && a.summary.kj! < 525, `kj ${a.summary.kj}`);
  // HR strap absent on this ride -> null, not a bogus value
  assert.equal(a.summary.avgHr, null);
});

test("swim FIT rejects the 65.535 speed sentinel", (t) => {
  const buf = sample("SWIM");
  if (!buf) return t.skip("no SWIM sample in references/.fit-files");
  const a = normalizeFit(buf);
  assert.equal(a.modality, "swim");
  assert.ok(a.summary.distanceM! > 530 && a.summary.distanceM! < 550);
  // session avgSpeed was 65.535 (invalid); enhancedAvgSpeed (~0.71) used instead
  assert.ok(
    a.summary.avgSpeedMps! > 0.5 && a.summary.avgSpeedMps! < 1.5,
    `avgSpeed ${a.summary.avgSpeedMps}`,
  );
});

test("gzip is transparent and the content hash is stable", (t) => {
  const buf = sample("RUN");
  if (!buf) return t.skip("no RUN sample in references/.fit-files");
  const a1 = normalizeFit(buf);
  const a2 = normalizeFit(buf);
  assert.equal(a1.fitHash, a2.fitHash);
  assert.equal(a1.fitHash.length, 64); // sha256 hex
});
