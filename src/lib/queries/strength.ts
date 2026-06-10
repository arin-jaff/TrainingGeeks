import type { DB } from "../db/client.js";
import { getSetting, listAllStrengthSets } from "../db/repo.js";
import type { StrengthSetRow } from "../db/types.js";
import { exerciseDisplayName } from "../strength/naming.js";
import { estimateOneRm, parseFormula, type OneRmFormula } from "../strength/onerm.js";

export function strengthFormula(db: DB): OneRmFormula {
  return parseFormula(getSetting(db, "strength.formula"));
}

export interface ExerciseMax {
  exercise: string; // display name
  estOneRmKg: number | null;
  bestWeightKg: number | null;
  bestWeightReps: number | null; // reps at the best (heaviest) set
  maxReps: number | null;
  bestVolumeKg: number | null; // best single-set reps × weight
  tonnageKg: number; // total reps × weight across all sets
  lastDate: string;
  setCount: number;
}

type SetWithDate = StrengthSetRow & { local_date: string };

/** Group all strength sets by exercise (display name) and compute per-exercise PRs. */
export function getExerciseMaxes(db: DB, formula = strengthFormula(db)): ExerciseMax[] {
  const byExercise = new Map<string, SetWithDate[]>();
  for (const s of listAllStrengthSets(db)) {
    const name = exerciseDisplayName(s.exercise_key, s.exercise_name);
    if (name === "Unnamed") continue; // skip unlabeled "Choose an Exercise" sets
    (byExercise.get(name) ?? byExercise.set(name, []).get(name)!).push(s);
  }

  const out: ExerciseMax[] = [];
  for (const [exercise, sets] of byExercise) {
    let estOneRmKg: number | null = null;
    let bestWeightKg: number | null = null;
    let bestWeightReps: number | null = null;
    let maxReps: number | null = null;
    let bestVolumeKg: number | null = null;
    let tonnageKg = 0;
    let lastDate = "";

    for (const s of sets) {
      if (s.local_date > lastDate) lastDate = s.local_date;
      if (s.reps != null) maxReps = Math.max(maxReps ?? 0, s.reps);
      if (s.weight_kg != null && s.weight_kg > 0 && s.reps != null) {
        const est = estimateOneRm(s.weight_kg, s.reps, formula);
        if (est != null && (estOneRmKg == null || est > estOneRmKg)) estOneRmKg = est;
        if (bestWeightKg == null || s.weight_kg > bestWeightKg) {
          bestWeightKg = s.weight_kg;
          bestWeightReps = s.reps;
        }
        const vol = s.weight_kg * s.reps;
        if (bestVolumeKg == null || vol > bestVolumeKg) bestVolumeKg = vol;
        tonnageKg += vol;
      }
    }

    out.push({
      exercise,
      estOneRmKg,
      bestWeightKg,
      bestWeightReps,
      maxReps,
      bestVolumeKg,
      tonnageKg,
      lastDate,
      setCount: sets.length,
    });
  }

  // Best estimated 1RM first; exercises without weights (null 1RM) sink to the bottom.
  out.sort((a, b) => (b.estOneRmKg ?? -1) - (a.estOneRmKg ?? -1));
  return out;
}

export interface ProgressionPoint {
  date: string;
  estOneRmKg: number;
}

/** Best estimated 1RM per day for one exercise — powers the progression chart. */
export function getExerciseProgression(
  db: DB,
  exercise: string,
  formula = strengthFormula(db),
): ProgressionPoint[] {
  const byDate = new Map<string, number>();
  for (const s of listAllStrengthSets(db)) {
    if (exerciseDisplayName(s.exercise_key, s.exercise_name) !== exercise) continue;
    const est = estimateOneRm(s.weight_kg, s.reps, formula);
    if (est == null) continue;
    byDate.set(s.local_date, Math.max(byDate.get(s.local_date) ?? 0, est));
  }
  return [...byDate.entries()]
    .map(([date, estOneRmKg]) => ({ date, estOneRmKg }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Exercises that have at least one weighted set (so 1RM/progression exist). */
export function weightedExercises(db: DB): string[] {
  return getExerciseMaxes(db)
    .filter((e) => e.estOneRmKg != null)
    .map((e) => e.exercise);
}
