import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateZones, hasMethodData } from "./engine.js";

test("Coggan power zones from FTP scale correctly", () => {
  const z = calculateZones("power", "andy-coggan-6", 250)!;
  assert.ok(z, "method data present");
  assert.equal(z.length, 7); // Coggan Z1..Z7
  assert.equal(z[0].low, 0);
  // contiguous + monotonic
  for (let i = 1; i < z.length; i++) {
    assert.equal(z[i].low, (z[i - 1].high as number) + 1);
    assert.ok((z[i].high as number) >= (z[i].low as number));
  }
  // Z4 ~ lactate threshold (105% of 250 ≈ 263)
  assert.ok(Math.abs((z[3].high as number) - 263) <= 2, `Z4 high ${z[3].high}`);
  // open top zone capped well above FTP
  assert.ok((z[6].high as number) >= 600);
});

test("Joe Friel HR zones from LTHR", () => {
  const z = calculateZones("hr", "joe-friel-7", 180)!;
  assert.ok(z);
  assert.equal(z.length, 7);
  assert.equal(z[0].low, 0);
  assert.ok((z[6].high as number) <= 255);
  assert.ok(z[0].name.startsWith("Zone 1"));
});

test("scaling with the anchor changes the ranges", () => {
  const a = calculateZones("power", "andy-coggan-6", 200)!;
  const b = calculateZones("power", "andy-coggan-6", 300)!;
  assert.ok((b[3].high as number) > (a[3].high as number));
});

test("hasMethodData reflects availability; bad inputs return null", () => {
  assert.equal(hasMethodData("power", "andy-coggan-6"), true);
  assert.equal(hasMethodData("power", "nope"), false);
  assert.equal(calculateZones("power", "andy-coggan-6", 0), null);
  assert.equal(calculateZones("hr", "does-not-exist", 180), null);
});
