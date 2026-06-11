import { addDays } from "../util/dates.js";

/**
 * Pure feed math: merge own + friends' shared activities into one
 * reverse-chronological feed, and roll it up into friends-only leaderboards.
 * No I/O — the server assembles inputs, the UI re-sorts rollups.
 */

/** One activity as the "activities" share scope exposes it (SI units). */
export interface SharedActivity {
  id: number;
  date: string; // YYYY-MM-DD
  modality: string;
  name: string | null;
  durationS: number | null;
  distanceM: number | null;
  avgSpeedMps: number | null;
  avgHr: number | null;
  maxHr: number | null;
  elevationGainM: number | null;
  tss: number | null;
  s3: number | null;
  intensityFactor: number | null;
  /** Image attachment ids (owner-local; optional — older cached payloads lack it). */
  imageIds?: number[];
}

export interface FeedPerson {
  handle: string;
  displayName: string | null;
  isSelf: boolean;
  online: boolean;
  /** Set when this person's data came from the directory's offline cache. */
  staleAsOf: string | null;
}

export interface FeedItem extends SharedActivity {
  person: FeedPerson;
  /** Owner-local reference the directory keys reactions on. */
  ref: string;
}

export interface FeedSource {
  person: FeedPerson;
  activities: SharedActivity[];
}

export function activityRef(a: { date: string; id: number }): string {
  return `${a.date}:${a.id}`;
}

/**
 * Merge sources into one feed: windowed to the last `days`, newest first
 * (ties broken by stress so the big session leads the day), capped at `limit`.
 */
export function buildFeed(
  sources: FeedSource[],
  today: string,
  { days = 30, limit = 50 }: { days?: number; limit?: number } = {},
): FeedItem[] {
  const start = addDays(today, -days);
  const items: FeedItem[] = [];
  for (const { person, activities } of sources) {
    for (const a of activities) {
      if (a.date < start || a.date > today) continue;
      items.push({ ...a, person, ref: activityRef(a) });
    }
  }
  items.sort(
    (x, y) =>
      y.date.localeCompare(x.date) ||
      stressOf(y) - stressOf(x) ||
      x.person.handle.localeCompare(y.person.handle),
  );
  return items.slice(0, limit);
}

const stressOf = (a: SharedActivity): number => (a.tss ?? 0) + (a.s3 ?? 0);

export interface LeaderRow {
  person: FeedPerson;
  activities: number;
  durationS: number;
  distanceM: number;
  stress: number; // TSS + S³ combined
}

/**
 * Per-person totals over [start, end] (inclusive), most training time first.
 * Everyone in `people` appears, even with a zero week — seeing the zero is
 * half the motivation.
 */
export function leaderboard(
  items: FeedItem[],
  people: FeedPerson[],
  start: string,
  end: string,
): LeaderRow[] {
  const rows = new Map<string, LeaderRow>();
  for (const p of people)
    rows.set(p.handle, { person: p, activities: 0, durationS: 0, distanceM: 0, stress: 0 });
  for (const it of items) {
    if (it.date < start || it.date > end) continue;
    const row = rows.get(it.person.handle);
    if (!row) continue;
    row.activities += 1;
    row.durationS += it.durationS ?? 0;
    row.distanceM += it.distanceM ?? 0;
    row.stress += stressOf(it);
  }
  return [...rows.values()].sort(
    (a, b) =>
      b.durationS - a.durationS ||
      b.stress - a.stress ||
      a.person.handle.localeCompare(b.person.handle),
  );
}

/** The Monday on or before `date` (weeks run Mon–Sun, like the calendar). */
export function weekStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun
  return addDays(date, -((dow + 6) % 7));
}
