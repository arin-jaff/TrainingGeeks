import type { DB } from "../db/client.js";
import { getAthlete } from "../db/repo.js";
import { todayLocal } from "../util/dates.js";
import { directoryUrl } from "./config.js";
import { getHandle, getSigner } from "./keystore.js";
import {
  fetchCachedScope,
  fetchScope,
  fetchSocialSummary,
  heartbeat,
  listFriends,
  type FriendView,
  type SocialCounts,
} from "./client.js";
import { buildSharedPayload } from "./share.js";
import {
  buildFeed,
  type FeedItem,
  type FeedPerson,
  type FeedSource,
  type SharedActivity,
} from "./feed.js";

export interface SocialFeedItem extends FeedItem {
  counts: SocialCounts | null; // null = directory didn't answer
}

export interface SocialFeed {
  enabled: boolean; // a directory is configured
  handle: string | null; // registered handle, if any
  today: string;
  items: SocialFeedItem[];
  people: FeedPerson[]; // self + every friend (for leaderboards/presence)
  error: string | null;
}

const none = (today: string, over: Partial<SocialFeed> = {}): SocialFeed => ({
  enabled: false,
  handle: null,
  today,
  items: [],
  people: [],
  error: null,
  ...over,
});

/** A friend's shared activities: live from their instance, else the cache. */
async function friendSource(
  db: DB,
  dirUrl: string,
  f: FriendView,
): Promise<FeedSource | null> {
  const signer = getSigner(db);
  const person: FeedPerson = {
    handle: f.handle,
    displayName: f.displayName,
    isSelf: false,
    online: f.presence.online,
    staleAsOf: null,
  };
  try {
    const data = (await fetchScope(signer, f.url, "activities")) as {
      activities?: SharedActivity[];
    };
    return { person, activities: data.activities ?? [] };
  } catch {
    try {
      const cached = await fetchCachedScope(signer, dirUrl, f.handle, "activities");
      const data = cached.payload as { activities?: SharedActivity[] };
      return {
        person: { ...person, staleAsOf: cached.updatedAt },
        activities: data.activities ?? [],
      };
    } catch {
      return { person, activities: [] }; // unreachable and uncached — show them, empty
    }
  }
}

/**
 * Assemble the whole social feed server-side (plain reads — works on the
 * read-only demo too): own activities + every friend who shares "activities",
 * merged newest-first, annotated with kudos/comment counts from the directory.
 */
export async function assembleFeed(db: DB): Promise<SocialFeed> {
  const tz = getAthlete(db)?.timezone ?? "America/New_York";
  const today = todayLocal(tz);
  const dirUrl = directoryUrl();
  if (!dirUrl) return none(today);

  const handle = getHandle(db);
  if (!handle) return none(today, { enabled: true });

  const self: FeedPerson = {
    handle,
    displayName: getAthlete(db)?.name ?? null,
    isSelf: true,
    online: true,
    staleAsOf: null,
  };
  const own = buildSharedPayload(db, "activities") as { activities: SharedActivity[] };
  const sources: FeedSource[] = [{ person: self, activities: own.activities }];
  const people: FeedPerson[] = [self];

  let error: string | null = null;
  try {
    // Opening the feed keeps presence fresh both ways (cheap; failure ignored).
    const [, { friends }] = await Promise.all([
      heartbeat(getSigner(db), dirUrl).catch(() => null),
      listFriends(getSigner(db), dirUrl),
    ]);
    const sharing = friends.filter((f) => f.sharesWithMe.includes("activities"));
    for (const f of friends) {
      if (sharing.some((s) => s.publicKey === f.publicKey)) continue;
      people.push({
        handle: f.handle,
        displayName: f.displayName,
        isSelf: false,
        online: f.presence.online,
        staleAsOf: null,
      });
    }
    const fetched = await Promise.all(sharing.map((f) => friendSource(db, dirUrl, f)));
    for (const src of fetched) {
      if (!src) continue;
      sources.push(src);
      people.push(src.person);
    }
  } catch (e) {
    error = (e as Error).message;
  }

  // 100 matches the directory's social-summary batch cap, and gives the
  // leaderboards the full 30-day window to total up.
  const items = buildFeed(sources, today, { limit: 100 });

  // Annotate with kudos/comment counts (one batched call; absent on failure).
  let counts: (SocialCounts | null)[] = items.map(() => null);
  if (items.length > 0) {
    try {
      const res = await fetchSocialSummary(
        getSigner(db),
        dirUrl,
        items.map((it) => ({ handle: it.person.handle, ref: it.ref })),
      );
      if (Array.isArray(res.counts) && res.counts.length === items.length)
        counts = res.counts;
    } catch {
      // feed still renders without counts
    }
  }

  return {
    enabled: true,
    handle,
    today,
    items: items.map((it, i) => ({ ...it, counts: counts[i] })),
    people,
    error,
  };
}
