import type { DB } from "../db/client.js";
import { directoryUrl } from "./config.js";
import { getHandle, getSigner } from "./keystore.js";
import { listFriends } from "./client.js";
import { verifySignature } from "./crypto.js";

export interface PeerRequest {
  key: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
  method: string;
  path: string;
  body: string;
}

/** Verify a peer's signed request; returns their public key, or null. */
export function verifyPeer(req: PeerRequest): string | null {
  const ok = verifySignature({
    key: req.key,
    method: req.method,
    path: req.path,
    timestamp: req.timestamp,
    body: req.body,
    signature: req.signature,
  });
  return ok ? req.key! : null;
}

// Cache "what I share with key X" briefly so each read doesn't hit the directory.
const CACHE_TTL_MS = 30 * 1000;
const cache = new Map<string, { scopes: string[]; at: number }>();

/**
 * The scopes this instance shares with `callerKey`, per the directory's friend
 * graph. Empty if they aren't an accepted friend. The directory is the
 * authority on the friendship + granted scope.
 */
export async function scopesSharedWith(
  db: DB,
  callerKey: string,
  now = Date.now(),
): Promise<string[]> {
  const hit = cache.get(callerKey);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.scopes;

  const url = directoryUrl();
  if (!url || !getHandle(db)) return [];
  try {
    const { friends } = await listFriends(getSigner(db), url);
    const friend = friends.find((f) => f.publicKey === callerKey);
    const scopes = friend?.iShareWith ?? [];
    cache.set(callerKey, { scopes, at: now });
    return scopes;
  } catch {
    return [];
  }
}

/** Test seam: clear the authz cache. */
export function clearPeerCache(): void {
  cache.clear();
}
