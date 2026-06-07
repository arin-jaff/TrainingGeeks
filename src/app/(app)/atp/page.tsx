import { getDb } from "@/lib/db/client";
import { getAthlete, listAppliedPlans } from "@/lib/db/repo";
import type { Units } from "@/lib/db/types";
import { todayLocal } from "@/lib/util/dates";
import { defaultStartDate } from "@/lib/training-plans/apply";
import TrainingPlansView from "@/components/plans/TrainingPlansView";

export const dynamic = "force-dynamic";

export default function AtpPage() {
  const db = getDb();
  const tz = getAthlete(db)?.timezone ?? "America/New_York";
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const today = todayLocal(tz);

  // Map applied plan source ("plan:<id>") → its scheduled date range.
  const applied = Object.fromEntries(
    listAppliedPlans(db).map((a) => [
      a.source.replace(/^plan:/, ""),
      { start: a.start_date, end: a.end_date, count: a.count },
    ]),
  );

  return (
    <TrainingPlansView
      applied={applied}
      defaultStart={defaultStartDate(today)}
      units={units}
    />
  );
}
