import { getDb } from "@/lib/db/client";
import { getAthlete } from "@/lib/db/repo";
import type { Units } from "@/lib/db/types";
import { resolveThresholdsMap } from "@/lib/workout/thresholds";
import WorkoutEditor from "@/components/workouts/WorkoutEditor";

export const dynamic = "force-dynamic";

export default function NewWorkoutPage() {
  const db = getDb();
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const thresholds = resolveThresholdsMap(db, new Date().toISOString().slice(0, 10));
  return (
    <WorkoutEditor
      initial={{ id: null, name: "", modality: "run", description: "", steps: [] }}
      units={units}
      thresholds={thresholds}
    />
  );
}
