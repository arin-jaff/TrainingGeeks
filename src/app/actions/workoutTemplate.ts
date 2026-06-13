"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { isReadOnly } from "@/lib/auth/config";
import {
  deleteWorkoutTemplate,
  getAthlete,
  getWorkoutTemplate,
  insertPlanned,
  insertWorkoutTemplate,
  listWorkoutTemplates,
  updateWorkoutTemplate,
} from "@/lib/db/repo";
import type { Modality } from "@/lib/db/types";
import { estimateWorkout } from "@/lib/workout/estimate";
import { resolveThresholds } from "@/lib/workout/thresholds";
import { summarizeWorkout } from "@/lib/workout/summary";
import { validateWorkout, type WorkoutDoc, type WorkoutStep } from "@/lib/workout/template";

export interface TemplateInput {
  id?: number | null;
  name: string;
  modality: Modality;
  description?: string;
  steps: WorkoutStep[];
}

export interface SaveResult {
  ok: boolean;
  id: number | null;
  errors: string[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Create or update a structured workout template. */
export async function saveTemplate(input: TemplateInput): Promise<SaveResult> {
  if (isReadOnly()) return { ok: false, id: input.id ?? null, errors: ["Read-only demo"] };
  const doc: WorkoutDoc = {
    name: input.name?.trim() ?? "",
    modality: input.modality,
    description: input.description?.trim() || undefined,
    steps: input.steps ?? [],
  };
  const { ok, errors } = validateWorkout(doc);
  if (!ok) return { ok: false, id: input.id ?? null, errors };

  const db = getDb();
  const th = resolveThresholds(db, doc.modality, today());
  const est = estimateWorkout(doc, th);

  const row = {
    name: doc.name,
    modality: doc.modality,
    description: doc.description ?? null,
    steps: JSON.stringify(doc.steps),
    est_duration_s: est.durationS,
    est_distance_m: est.distanceM,
    est_tss: est.tss,
  };

  let id = input.id ?? null;
  if (id) updateWorkoutTemplate(db, id, row);
  else id = insertWorkoutTemplate(db, row);

  revalidatePath("/workout-library");
  return { ok: true, id, errors: [] };
}

export async function deleteTemplate(id: number): Promise<void> {
  if (isReadOnly()) return;
  deleteWorkoutTemplate(getDb(), id);
  revalidatePath("/workout-library");
}

/** Copy an existing template into a new "(copy)" template. */
export async function duplicateTemplate(id: number): Promise<{ id: number | null }> {
  if (isReadOnly()) return { id: null };
  const db = getDb();
  const t = getWorkoutTemplate(db, id);
  if (!t) return { id: null };
  const newId = insertWorkoutTemplate(db, {
    name: `${t.name} (copy)`,
    modality: t.modality,
    description: t.description,
    steps: t.steps,
    est_duration_s: t.est_duration_s,
    est_distance_m: t.est_distance_m,
    est_tss: t.est_tss,
  });
  revalidatePath("/workout-library");
  return { id: newId };
}

/**
 * Schedule a template onto a calendar date: a planned_workout carrying a frozen
 * copy of the structure (so later template edits don't rewrite history), with
 * the estimate recomputed against the thresholds in effect on that date.
 */
export async function scheduleTemplate(
  id: number,
  date: string,
): Promise<{ ok: boolean; plannedId: number | null }> {
  if (isReadOnly()) return { ok: false, plannedId: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, plannedId: null };
  const db = getDb();
  const t = getWorkoutTemplate(db, id);
  if (!t) return { ok: false, plannedId: null };

  const athlete = getAthlete(db);
  const units = athlete?.units ?? "imperial";
  const steps = JSON.parse(t.steps) as WorkoutStep[];
  const doc: WorkoutDoc = { name: t.name, modality: t.modality, steps };
  const est = estimateWorkout(doc, resolveThresholds(db, t.modality, date));

  const plannedId = insertPlanned(db, {
    modality: t.modality,
    date,
    name: t.name,
    description: t.description ?? summarizeWorkout(steps, units, t.modality),
    planned_duration_s: est.durationS,
    planned_distance_m: est.distanceM,
    planned_tss: est.tss,
    source: "manual",
    structure: t.steps,
    template_id: t.id,
  });

  revalidatePath("/calendar");
  revalidatePath("/");
  return { ok: true, plannedId };
}

/** Lightweight list for pickers (id + name + modality). */
export async function listTemplatesBrief(): Promise<
  { id: number; name: string; modality: Modality }[]
> {
  return listWorkoutTemplates(getDb()).map((t) => ({
    id: t.id,
    name: t.name,
    modality: t.modality,
  }));
}
