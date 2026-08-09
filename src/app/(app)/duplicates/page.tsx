import { getDb } from "@/lib/db/client";
import { getAthlete } from "@/lib/db/repo";
import { getDuplicatePairs } from "@/lib/queries/duplicates";
import type { Units } from "@/lib/db/types";
import DuplicateReview from "@/components/activity/DuplicateReview";

export const dynamic = "force-dynamic";

export default async function DuplicatesPage() {
  const db = getDb();
  const athlete = getAthlete(db);
  const units: Units = athlete?.units ?? "imperial";
  const tz = athlete?.timezone ?? "America/New_York";
  const pairs = getDuplicatePairs(db);

  return (
    <div>
      <div className="mb-4 border-b border-line pb-3">
        <h1 className="text-lg font-semibold text-ink">Duplicate Activities</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {pairs.length === 0
            ? "Nothing to review."
            : `${pairs.length} ${pairs.length === 1 ? "pair covers" : "pairs cover"} the same stretch of time. Pick the recording to keep, take any fields the other one has, and delete the duplicate.`}
        </p>
      </div>
      <DuplicateReview pairs={pairs} units={units} tz={tz} />
    </div>
  );
}
