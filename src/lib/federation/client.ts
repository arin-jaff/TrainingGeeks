import { canonicalString, type Signer } from "./crypto.js";

/** Shareable views a friend may be granted. Enforcement lands in Phase 2. */
export const SCOPES = ["calendar", "pmc", "activities", "peaks"] as const;
export type Scope = (typeof SCOPES)[number];

export interface Presence {
  online: boolean;
  lastSeen: string | null;
}
export interface FriendView {
  handle: string;
  publicKey: string;
  url: string;
  displayName: string | null;
  sharesWithMe: string[]; // scopes the friend lets me read
  iShareWith: string[]; // scopes I let the friend read
  presence: Presence;
}
export interface PendingView {
  handle: string;
  publicKey: string;
  scope: string[];
}
export interface FriendsResponse {
  friends: FriendView[];
  incoming: PendingView[];
  outgoing: PendingView[];
}

class DirectoryError extends Error {}

/** Sign and send a request to the directory, matching its canonical format. */
async function call<T>(
  signer: Signer,
  directoryUrl: string,
  method: string,
  routePath: string,
  body?: unknown,
): Promise<T> {
  const url = `${directoryUrl}${routePath}`;
  const path = new URL(url).pathname;
  const raw = body === undefined ? "" : JSON.stringify(body);
  const ts = Date.now();

  const headers: Record<string, string> = {
    "X-TG-Key": signer.publicKey,
    "X-TG-Timestamp": String(ts),
    "X-TG-Signature": signer.sign(canonicalString(method, path, ts, raw)),
  };
  if (raw) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    // Bounded so one dead peer can't hang a whole feed assembly.
    res = await fetch(url, {
      method,
      headers,
      body: raw || undefined,
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    throw new DirectoryError(`Cannot reach the directory: ${(e as Error).message}`);
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new DirectoryError((json.error as string) || `Directory error ${res.status}`);
  return json as T;
}

export function register(
  signer: Signer,
  directoryUrl: string,
  fields: { handle: string; url: string; displayName?: string },
): Promise<{ ok: boolean; handle: string }> {
  return call(signer, directoryUrl, "POST", "/v1/register", fields);
}

export function heartbeat(
  signer: Signer,
  directoryUrl: string,
): Promise<{ ok: boolean; lastSeen: string }> {
  return call(signer, directoryUrl, "POST", "/v1/heartbeat");
}

export function resolve(
  signer: Signer,
  directoryUrl: string,
  handle: string,
): Promise<{ handle: string; publicKey: string; url: string; presence: Presence }> {
  return call(signer, directoryUrl, "GET", `/v1/resolve/${encodeURIComponent(handle)}`);
}

export function requestFriend(
  signer: Signer,
  directoryUrl: string,
  handle: string,
  scope: string[],
): Promise<{ ok: boolean; status: string }> {
  return call(signer, directoryUrl, "POST", "/v1/friends/request", { handle, scope });
}

export function respondFriend(
  signer: Signer,
  directoryUrl: string,
  handle: string,
  accept: boolean,
  scope: string[],
): Promise<{ ok: boolean; status: string }> {
  return call(signer, directoryUrl, "POST", "/v1/friends/respond", { handle, accept, scope });
}

export function listFriends(signer: Signer, directoryUrl: string): Promise<FriendsResponse> {
  return call(signer, directoryUrl, "GET", "/v1/friends");
}

/** Fetch one shared scope directly from a friend's instance (peer-to-peer). */
export function fetchScope(
  signer: Signer,
  friendBaseUrl: string,
  scope: string,
): Promise<unknown> {
  return call(
    signer,
    friendBaseUrl.replace(/\/+$/, ""),
    "GET",
    `/api/federation/v1/${encodeURIComponent(scope)}`,
  );
}

/** Fetch one downscaled activity image from a friend's instance (binary). */
export async function fetchPeerImage(
  signer: Signer,
  friendBaseUrl: string,
  imageId: number,
): Promise<{ data: ArrayBuffer; mime: string }> {
  const path = `/api/federation/v1/image/${imageId}`;
  const ts = Date.now();
  const res = await fetch(`${friendBaseUrl.replace(/\/+$/, "")}${path}`, {
    headers: {
      "X-TG-Key": signer.publicKey,
      "X-TG-Timestamp": String(ts),
      "X-TG-Signature": signer.sign(canonicalString("GET", path, ts, "")),
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new DirectoryError(`Image fetch failed (${res.status})`);
  return {
    data: await res.arrayBuffer(),
    mime: res.headers.get("Content-Type") ?? "image/webp",
  };
}

/** Push a cached copy of one shared scope to the directory (offline fallback). */
export function putCache(
  signer: Signer,
  directoryUrl: string,
  scope: string,
  payload: unknown,
): Promise<{ ok: boolean }> {
  return call(signer, directoryUrl, "PUT", `/v1/cache/${encodeURIComponent(scope)}`, { payload });
}

/** Read a friend's cached scope from the directory (when they're offline). */
export function fetchCachedScope(
  signer: Signer,
  directoryUrl: string,
  handle: string,
  scope: string,
): Promise<{ scope: string; updatedAt: string; payload: unknown }> {
  return call(
    signer,
    directoryUrl,
    "GET",
    `/v1/cache/${encodeURIComponent(handle)}/${encodeURIComponent(scope)}`,
  );
}

// ---- social: kudos + comments (stored on the directory) -------------------

export interface SocialCounts {
  kudos: number;
  comments: number;
  mine: boolean; // I have kudos'd this activity
}

export interface ActivitySocial {
  kudos: { handle: string; displayName: string | null }[];
  myKudos: boolean;
  comments: {
    id: number;
    handle: string;
    displayName: string | null;
    body: string;
    createdAt: string;
    mine: boolean;
  }[];
}

/** Toggle a kudos on a friend's activity. `ref` is "<date>:<activityId>". */
export function toggleKudos(
  signer: Signer,
  directoryUrl: string,
  handle: string,
  ref: string,
): Promise<{ ok: boolean; kudosed: boolean; count: number }> {
  return call(signer, directoryUrl, "POST", "/v1/social/kudos", { handle, ref });
}

export function postComment(
  signer: Signer,
  directoryUrl: string,
  handle: string,
  ref: string,
  body: string,
): Promise<{ ok: boolean; id: number }> {
  return call(signer, directoryUrl, "POST", "/v1/social/comment", { handle, ref, body });
}

export function deleteComment(
  signer: Signer,
  directoryUrl: string,
  id: number,
): Promise<{ ok: boolean }> {
  return call(signer, directoryUrl, "DELETE", `/v1/social/comment/${id}`);
}

/** The full kudos list + comment thread on one activity. */
export function fetchActivitySocial(
  signer: Signer,
  directoryUrl: string,
  handle: string,
  ref: string,
): Promise<ActivitySocial> {
  return call(
    signer,
    directoryUrl,
    "GET",
    `/v1/social/${encodeURIComponent(handle)}/${encodeURIComponent(ref)}`,
  );
}

/** Batched kudos/comment counts for a feed (max 100 items). */
export function fetchSocialSummary(
  signer: Signer,
  directoryUrl: string,
  items: { handle: string; ref: string }[],
): Promise<{ counts: SocialCounts[] }> {
  return call(signer, directoryUrl, "POST", "/v1/social/summary", { items });
}
