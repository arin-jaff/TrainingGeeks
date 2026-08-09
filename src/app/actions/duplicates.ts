"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { isReadOnly } from "@/lib/auth/config";
import { mergeActivityInto, setSetting } from "@/lib/db/repo";
import {
  DISMISSED_KEY,
  DUPE_FIELDS,
  pairKey,
  readDismissed,
} from "@/lib/queries/duplicates";
import { recomputeFitness } from "@/lib/fitness/recompute";

const MERGEABLE = new Set(DUPE_FIELDS.map((f) => f.key));

export interface MergeResult {
  ok: boolean;
  error?: string;
}

/**
 * Fold one duplicate into the other: the named fields are copied across before
 * the loser is deleted. Only columns on the duplicate-review list can be
 * copied — the field names arrive from the browser and end up in SQL.
 */
export async function mergeDuplicate(
  keepId: number,
  dropId: number,
  fields: string[],
): Promise<MergeResult> {
  if (isReadOnly()) return { ok: false, error: "Read-only demo" };
  if (!Number.isInteger(keepId) || !Number.isInteger(dropId) || keepId === dropId) {
    return { ok: false, error: "Invalid activity pair" };
  }

  const db = getDb();
  const safe = (Array.isArray(fields) ? fields : []).filter((f) => MERGEABLE.has(f));
  if (!mergeActivityInto(db, keepId, dropId, safe)) {
    return { ok: false, error: "Activity not found" };
  }

  // Dismissals naming the deleted row can never match again.
  const kept = [...readDismissed(db)].filter(
    (k) => !k.split("-").includes(String(dropId)),
  );
  setSetting(db, DISMISSED_KEY, JSON.stringify(kept));

  recomputeFitness(db);
  for (const p of ["/duplicates", "/", "/calendar", "/dashboard"]) revalidatePath(p);
  return { ok: true };
}

/** Mark a pair as legitimately distinct so the scan stops surfacing it. */
export async function dismissDuplicate(aId: number, bId: number): Promise<MergeResult> {
  if (isReadOnly()) return { ok: false, error: "Read-only demo" };
  if (!Number.isInteger(aId) || !Number.isInteger(bId)) {
    return { ok: false, error: "Invalid activity pair" };
  }
  const db = getDb();
  const dismissed = readDismissed(db);
  dismissed.add(pairKey(aId, bId));
  setSetting(db, DISMISSED_KEY, JSON.stringify([...dismissed]));
  revalidatePath("/duplicates");
  revalidatePath("/");
  return { ok: true };
}
