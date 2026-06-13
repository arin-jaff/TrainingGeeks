import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getAthlete, getWorkoutTemplate } from "@/lib/db/repo";
import type { Units } from "@/lib/db/types";
import { resolveThresholdsMap } from "@/lib/workout/thresholds";
import type { WorkoutStep } from "@/lib/workout/template";
import WorkoutEditor from "@/components/workouts/WorkoutEditor";

export const dynamic = "force-dynamic";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();

  const db = getDb();
  const t = getWorkoutTemplate(db, numId);
  if (!t) notFound();

  const units: Units = getAthlete(db)?.units ?? "imperial";
  const thresholds = resolveThresholdsMap(db, new Date().toISOString().slice(0, 10));

  let steps: WorkoutStep[] = [];
  try {
    steps = JSON.parse(t.steps) as WorkoutStep[];
  } catch {
    steps = [];
  }

  return (
    <WorkoutEditor
      initial={{
        id: t.id,
        name: t.name,
        modality: t.modality,
        description: t.description ?? "",
        steps,
      }}
      units={units}
      thresholds={thresholds}
    />
  );
}
