import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activityRef,
  buildFeed,
  leaderboard,
  weekStart,
  type FeedPerson,
  type SharedActivity,
} from "./feed.js";

const me: FeedPerson = {
  handle: "arin",
  displayName: "Arin",
  isSelf: true,
  online: true,
  staleAsOf: null,
};
const sam: FeedPerson = {
  handle: "sam",
  displayName: null,
  isSelf: false,
  online: false,
  staleAsOf: "2026-06-09 12:00:00",
};

function act(over: Partial<SharedActivity>): SharedActivity {
  return {
    id: 1,
    date: "2026-06-09",
    modality: "run",
    name: null,
    durationS: 3600,
    distanceM: 10000,
    avgSpeedMps: null,
    avgHr: null,
    maxHr: null,
    elevationGainM: null,
    tss: 60,
    s3: null,
    intensityFactor: null,
    ...over,
  };
}

test("feed merges sources newest-first, big sessions lead the day", () => {
  const items = buildFeed(
    [
      { person: me, activities: [act({ id: 1, date: "2026-06-08", tss: 40 })] },
      {
        person: sam,
        activities: [
          act({ id: 5, date: "2026-06-09", tss: 90 }),
          act({ id: 6, date: "2026-06-08", tss: 80 }),
        ],
      },
    ],
    "2026-06-09",
  );
  assert.deepEqual(
    items.map((i) => `${i.person.handle}:${i.id}`),
    ["sam:5", "sam:6", "arin:1"],
  );
  assert.equal(items[0].ref, "2026-06-09:5");
});

test("feed windows to the last N days and respects the limit", () => {
  const acts = [
    act({ id: 1, date: "2026-06-09" }),
    act({ id: 2, date: "2026-05-12" }),
    act({ id: 3, date: "2026-04-01" }), // outside 30-day window
    act({ id: 4, date: "2026-06-11" }), // future — excluded
  ];
  const items = buildFeed([{ person: me, activities: acts }], "2026-06-09");
  assert.deepEqual(items.map((i) => i.id), [1, 2]);

  const capped = buildFeed([{ person: me, activities: acts }], "2026-06-09", { limit: 1 });
  assert.equal(capped.length, 1);
});

test("S³ counts as stress for strength sessions", () => {
  const items = buildFeed(
    [
      {
        person: me,
        activities: [
          act({ id: 1, modality: "lift", tss: null, s3: 70 }),
          act({ id: 2, tss: 50 }),
        ],
      },
    ],
    "2026-06-09",
  );
  assert.deepEqual(items.map((i) => i.id), [1, 2]); // 70 S³ outranks 50 TSS
});

test("leaderboard totals the window and keeps zero rows visible", () => {
  const items = buildFeed(
    [
      {
        person: me,
        activities: [
          act({ id: 1, date: "2026-06-08", durationS: 3600, distanceM: 10000, tss: 60 }),
          act({ id: 2, date: "2026-06-09", durationS: 1800, distanceM: 5000, tss: 30 }),
          act({ id: 3, date: "2026-06-01", durationS: 9999, tss: 999 }), // before the week
        ],
      },
      { person: sam, activities: [] },
    ],
    "2026-06-09",
  );
  const rows = leaderboard(items, [me, sam], "2026-06-08", "2026-06-14");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].person.handle, "arin");
  assert.equal(rows[0].activities, 2);
  assert.equal(rows[0].durationS, 5400);
  assert.equal(rows[0].distanceM, 15000);
  assert.equal(rows[0].stress, 90);
  assert.equal(rows[1].person.handle, "sam");
  assert.equal(rows[1].durationS, 0);
});

test("weekStart finds the Monday on or before a date", () => {
  assert.equal(weekStart("2026-06-09"), "2026-06-08"); // Tue -> Mon
  assert.equal(weekStart("2026-06-08"), "2026-06-08"); // Mon -> itself
  assert.equal(weekStart("2026-06-14"), "2026-06-08"); // Sun -> prior Mon
});

test("activityRef is date-scoped", () => {
  assert.equal(activityRef({ date: "2026-06-09", id: 42 }), "2026-06-09:42");
});
