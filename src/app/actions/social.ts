"use server";

import { getDb } from "@/lib/db/client";
import { directoryUrl } from "@/lib/federation/config";
import { getSigner } from "@/lib/federation/keystore";
import * as dir from "@/lib/federation/client";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const noDirectory = { ok: false as const, error: "No directory configured." };

/** Toggle a kudos on a friend's activity. */
export async function giveKudos(
  handle: string,
  ref: string,
): Promise<Result<{ kudosed: boolean; count: number }>> {
  const url = directoryUrl();
  if (!url) return noDirectory;
  try {
    const r = await dir.toggleKudos(getSigner(getDb()), url, handle, ref);
    return { ok: true, kudosed: r.kudosed, count: r.count };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Comment on an activity (yours or a friend's). */
export async function postComment(
  handle: string,
  ref: string,
  body: string,
): Promise<Result> {
  const url = directoryUrl();
  if (!url) return noDirectory;
  try {
    await dir.postComment(getSigner(getDb()), url, handle, ref, body);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Delete a comment you wrote, or any comment on your own activity. */
export async function removeComment(id: number): Promise<Result> {
  const url = directoryUrl();
  if (!url) return noDirectory;
  try {
    await dir.deleteComment(getSigner(getDb()), url, id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
