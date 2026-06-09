import type { DB } from "../db/client.js";
import {
  activityTotalsForModality,
  latestActivityForModality,
  type ModalityTotals,
} from "../db/repo.js";
import type { Modality } from "../db/types.js";
import { MODALITY_LABEL } from "../util/format.js";
import { addDays } from "../util/dates.js";

const SPORTS: Modality[] = ["run", "bike", "swim", "row", "lift", "core"];
const isStrength = (m: Modality) => m === "lift" || m === "core";

export interface SportLastActivity {
  id: number;
  name: string;
  date: string; // local_date YYYY-MM-DD
  durationS: number | null;
  distanceM: number | null;
  avgSpeedMps: number | null;
  stress: number | null;
  stressLabel: "TSS" | "S³";
}

export interface SportSummary {
  modality: Modality;
  label: string;
  last: SportLastActivity | null;
  week: ModalityTotals;
  allTime: ModalityTotals;
}

/**
 * Per-sport rollup powering the home "Your Sports" hover panels: the most
 * recent activity, the trailing-7-day totals, and the all-time totals.
 */
export function getSportSummaries(db: DB, today: string): SportSummary[] {
  const weekStart = addDays(today, -6);
  return SPORTS.map((modality) => {
    const a = latestActivityForModality(db, modality);
    const strength = isStrength(modality);
    return {
      modality,
      label: MODALITY_LABEL[modality],
      last: a
        ? {
            id: a.id,
            name: a.name ?? MODALITY_LABEL[modality],
            date: a.local_date,
            durationS: a.duration_s,
            distanceM: a.distance_m,
            avgSpeedMps: a.avg_speed_mps,
            stress: strength ? a.s3 : a.tss,
            stressLabel: strength ? "S³" : "TSS",
          }
        : null,
      week: activityTotalsForModality(db, modality, weekStart, today),
      allTime: activityTotalsForModality(db, modality),
    };
  });
}
