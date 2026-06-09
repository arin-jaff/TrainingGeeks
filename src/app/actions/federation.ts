"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { directoryUrl, publicUrl } from "@/lib/federation/config";
import { getHandle, getSigner, savePublicUrl, setHandle } from "@/lib/federation/keystore";
import * as dir from "@/lib/federation/client";

export interface FederationStatus {
  enabled: boolean; // a directory is configured
  directoryUrl: string | null;
  publicUrl: string | null;
  publicKey: string | null; // this instance's identity (safe to show)
  handle: string | null; // registered handle, if any
  friends: dir.FriendView[];
  incoming: dir.PendingView[];
  outgoing: dir.PendingView[];
  error: string | null;
}

const empty = (over: Partial<FederationStatus>): FederationStatus => ({
  enabled: false,
  directoryUrl: null,
  publicUrl: null,
  publicKey: null,
  handle: null,
  friends: [],
  incoming: [],
  outgoing: [],
  error: null,
  ...over,
});

/** Current federation state for the Friends panel. Never returns the private key. */
export async function getFederationStatus(): Promise<FederationStatus> {
  const db = getDb();
  const url = directoryUrl();
  if (!url) return empty({ enabled: false });

  const signer = getSigner(db);
  const handle = getHandle(db);
  const base = empty({
    enabled: true,
    directoryUrl: url,
    publicUrl: publicUrl(db),
    publicKey: signer.publicKey,
    handle,
  });
  if (!handle) return base;

  try {
    // A heartbeat doubles as "am I still reachable" and keeps presence fresh.
    await dir.heartbeat(signer, url).catch(() => {});
    const f = await dir.listFriends(signer, url);
    return { ...base, friends: f.friends, incoming: f.incoming, outgoing: f.outgoing };
  } catch (e) {
    return { ...base, error: (e as Error).message };
  }
}

export async function registerHandle(
  handle: string,
  displayName: string,
  publicUrlInput: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const url = directoryUrl();
  if (!url) return { ok: false, error: "No directory configured (set TG_DIRECTORY_URL)." };

  const myUrl = publicUrl(db) || publicUrlInput.trim();
  if (!/^https?:\/\//.test(myUrl))
    return { ok: false, error: "Enter this instance's public URL (https://…)." };
  if (!process.env.TG_PUBLIC_URL) savePublicUrl(db, myUrl);

  try {
    const res = await dir.register(getSigner(db), url, {
      handle: handle.trim(),
      url: myUrl,
      displayName: displayName.trim() || undefined,
    });
    setHandle(db, res.handle);
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function sendFriendRequest(
  handle: string,
  scope: string[],
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const url = directoryUrl();
  if (!url) return { ok: false, error: "No directory configured." };
  try {
    await dir.requestFriend(getSigner(db), url, handle.trim(), scope);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function respondToFriend(
  handle: string,
  accept: boolean,
  scope: string[],
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const url = directoryUrl();
  if (!url) return { ok: false, error: "No directory configured." };
  try {
    await dir.respondFriend(getSigner(db), url, handle, accept, scope);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
