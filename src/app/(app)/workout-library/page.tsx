import { getDb } from "@/lib/db/client";
import { getAthlete, listWorkoutTemplates } from "@/lib/db/repo";
import type { Units } from "@/lib/db/types";
import { summarizeWorkout } from "@/lib/workout/summary";
import type { WorkoutStep } from "@/lib/workout/template";
import WorkoutLibrary, { type TemplateListItem } from "@/components/workouts/WorkoutLibrary";

export const dynamic = "force-dynamic";

export default function WorkoutLibraryPage() {
  const db = getDb();
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const items: TemplateListItem[] = listWorkoutTemplates(db).map((t) => {
    let summary = "";
    try {
      summary = summarizeWorkout(JSON.parse(t.steps) as WorkoutStep[], units, t.modality);
    } catch {
      summary = "";
    }
    return {
      id: t.id,
      name: t.name,
      modality: t.modality,
      summary,
      estDurationS: t.est_duration_s,
      estDistanceM: t.est_distance_m,
      estTss: t.est_tss,
    };
  });
  return <WorkoutLibrary templates={items} units={units} />;
}
