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
    res = await fetch(url, { method, headers, body: raw || undefined });
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
