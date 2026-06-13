import { test } from "node:test";
import assert from "node:assert/strict";
import { downsampleTrack } from "./routes.js";

test("downsampleTrack drops nulls and keeps GeoJSON [lng,lat] order", () => {
  const lat = [10, null, 11, 12];
  const lng = [-70, -70.1, null, -72];
  const out = downsampleTrack(lat, lng);
  // index 1 (null lat... no, lat[1] null) and index 2 (null lng) are dropped → indices 0,3 valid
  assert.deepEqual(out, [
    [-70, 10],
    [-72, 12],
  ]);
});

test("downsampleTrack thins long tracks to roughly the cap and keeps the last fix", () => {
  const n = 5000;
  const lat = Array.from({ length: n }, (_, i) => 40 + i / 100000);
  const lng = Array.from({ length: n }, (_, i) => -74 + i / 100000);
  const out = downsampleTrack(lat, lng);
  assert.ok(out.length <= 251, `kept ${out.length}`);
  assert.ok(out.length >= 100, `kept ${out.length}`);
  // last point is the final fix
  assert.deepEqual(out[out.length - 1], [lng[n - 1], lat[n - 1]]);
});

test("downsampleTrack returns nothing for under two valid fixes", () => {
  assert.deepEqual(downsampleTrack([null, 1], [null, null]), []);
  assert.deepEqual(downsampleTrack([], []), []);
});
