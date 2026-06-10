import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { DB } from "../db/client.js";
import {
  listActivitiesBetween,
  listStrengthSets,
  replaceStrengthSets,
} from "../db/repo.js";
import { normalizeFit } from "../fit/normalize.js";

/**
 * Populate strength_set for existing strength activities by re-reading their
 * stored raw FITs (the set data isn't in the saved stream). Skips activities
 * that already have sets or have no raw file. Safe to run repeatedly.
 */
export function backfillStrengthSets(db: DB): { processed: number; sets: number } {
  const strength = listActivitiesBetween(db, "0000-01-01", "9999-12-31").filter(
    (a) => (a.modality === "lift" || a.modality === "core") && a.raw_path,
  );

  let processed = 0;
  let sets = 0;
  for (const a of strength) {
    if (listStrengthSets(db, a.id).length > 0) continue;
    const path = isAbsolute(a.raw_path!) ? a.raw_path! : join(process.cwd(), a.raw_path!);
    if (!existsSync(path)) continue;
    try {
      const n = normalizeFit(readFileSync(path));
      if (n.sets.length === 0) continue;
      replaceStrengthSets(
        db,
        a.id,
        n.sets.map((s) => ({
          set_index: s.setIndex,
          exercise_key: s.exerciseKey,
          reps: s.reps,
          duration_s: s.durationS,
          rest_s: s.restS,
          weight_kg: s.weightKg,
        })),
      );
      processed++;
      sets += n.sets.length;
    } catch {
      // A corrupt/unreadable FIT shouldn't stop the backfill.
    }
  }
  return { processed, sets };
}
