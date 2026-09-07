"use server";

import { revalidatePath } from "next/cache";
import { isReadOnly } from "@/lib/auth/config";
import { getDb } from "@/lib/db/client";
import { deleteShareLink } from "@/lib/db/repo";
import { createShareLink } from "@/lib/queries/share";

/** Opt an activity in to a public /share/<token> page. Returns the token. */
export async function createActivityShareLink(
  activityId: number,
): Promise<string | null> {
  if (isReadOnly()) return null;
  if (!Number.isInteger(activityId)) return null;
  const token = createShareLink(getDb(), activityId);
  revalidatePath(`/activity/${activityId}`);
  return token;
}

/** Revoke the public link — the old URL 404s from the next request on. */
export async function revokeActivityShareLink(activityId: number): Promise<void> {
  if (isReadOnly()) return;
  if (!Number.isInteger(activityId)) return;
  deleteShareLink(getDb(), activityId);
  revalidatePath(`/activity/${activityId}`);
}
