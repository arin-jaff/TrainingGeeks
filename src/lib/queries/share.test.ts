import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../db/client.js";
import {
  deleteActivity,
  deleteShareLink,
  getShareLink,
  insertActivity,
  updateAthlete,
} from "../db/repo.js";
import { seed } from "../db/seed.js";
import { createShareLink, getSharedActivity } from "./share.js";

function seedActivity(db: ReturnType<typeof openDb>, over: Record<string, unknown> = {}) {
  return insertActivity(db, {
    modality: "run",
    start_time: "2026-06-01T12:00:00.000Z",
    local_date: "2026-06-01",
    name: "Morning Run",
    notes: "public description",
    private_notes: "SECRET-PRIVATE-NOTE",
    duration_s: 3600,
    distance_m: 16000,
    tss: 80,
    ...over,
  });
}

test("createShareLink mints an unguessable token, one per activity", () => {
  const db = openDb(":memory:");
  const a = seedActivity(db);
  const b = seedActivity(db, { name: "Evening Run" });

  const t1 = createShareLink(db, a);
  assert.ok(t1.length >= 22, `token too short: ${t1}`);
  assert.ok(!/^\d+$/.test(t1), "a token must not be an id");
  assert.match(t1, /^[A-Za-z0-9_-]+$/, "base64url only — safe in a URL path");

  assert.equal(createShareLink(db, a), t1, "re-sharing returns the live token");
  assert.notEqual(createShareLink(db, b), t1, "each activity gets its own token");

  // 100 consecutive activities, 100 distinct full-length tokens: anything
  // sequential or derived from the id fails this.
  const seen = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const t = createShareLink(db, seedActivity(db));
    assert.equal(t.length, 22);
    seen.add(t);
  }
  assert.equal(seen.size, 100, "tokens must not repeat or follow the id");
});

test("getSharedActivity resolves a token to that one activity and leaks nothing", () => {
  const db = openDb(":memory:");
  seed(db);
  updateAthlete(db, { name: "Arin", email: "arin@example.com" });
  const id = seedActivity(db);
  seedActivity(db, { name: "Someone else's run", notes: "OTHER-ACTIVITY" });

  const view = getSharedActivity(db, createShareLink(db, id));
  assert.ok(view);
  assert.equal(view.name, "Morning Run");
  assert.equal(view.description, "public description");
  assert.equal(view.distanceM, 16000);

  const json = JSON.stringify(view);
  assert.ok(!json.includes("SECRET-PRIVATE-NOTE"), "private notes are never shared");
  assert.ok(!json.includes("OTHER-ACTIVITY"), "no other activity is exposed");
  assert.ok(!json.includes("arin@example.com"), "the athlete is not exposed");
  for (const leaked of ["private_notes", "id", "fit_hash", "raw_path", "email"]) {
    assert.ok(!(leaked in view), `${leaked} must not be in the public view`);
  }
});

test("an unknown or revoked token resolves to nothing", () => {
  const db = openDb(":memory:");
  const id = seedActivity(db);
  const token = createShareLink(db, id);
  assert.ok(getSharedActivity(db, token));

  assert.equal(getSharedActivity(db, "not-a-real-token"), null);
  assert.equal(getSharedActivity(db, ""), null);

  deleteShareLink(db, id);
  assert.equal(getSharedActivity(db, token), null, "revoking kills the old link");
  assert.equal(
    createShareLink(db, id) === token,
    false,
    "re-sharing after a revoke mints a new token",
  );
});

test("deleting an activity cascades its share link away", () => {
  const db = openDb(":memory:");
  const id = seedActivity(db);
  const token = createShareLink(db, id);
  deleteActivity(db, id);
  assert.equal(getShareLink(db, token), undefined);
  assert.equal(getSharedActivity(db, token), null);
});
