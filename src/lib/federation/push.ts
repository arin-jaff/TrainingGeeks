import type { DB } from "../db/client.js";
import { getSetting, setSetting } from "../db/repo.js";
import { directoryUrl } from "./config.js";
import { getHandle, getSigner } from "./keystore.js";
import { listFriends, putCache } from "./client.js";
import { buildSharedPayload } from "./share.js";

const PUSH_SETTING = "federation_cache_pushed_at";
const MIN_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Publish the owner's opted-in scopes to the directory cache, so friends can
 * view them while this instance is offline. Pushes the union of scopes shared
 * with any friend. Throttled to at most once per 15 min (call freely).
 */
export async function pushSharedCache(db: DB, now = Date.now()): Promise<void> {
  const url = directoryUrl();
  if (!url || !getHandle(db)) return;

  const last = Number(getSetting(db, PUSH_SETTING) ?? 0);
  if (now - last < MIN_INTERVAL_MS) return;

  const signer = getSigner(db);
  let scopes: Set<string>;
  try {
    const { friends } = await listFriends(signer, url);
    scopes = new Set(friends.flatMap((f) => f.iShareWith));
  } catch {
    return;
  }
  if (scopes.size === 0) {
    setSetting(db, PUSH_SETTING, String(now));
    return;
  }

  for (const scope of scopes) {
    const payload = buildSharedPayload(db, scope);
    if (payload != null) {
      await putCache(signer, url, scope, payload).catch(() => {});
    }
  }
  setSetting(db, PUSH_SETTING, String(now));
}
