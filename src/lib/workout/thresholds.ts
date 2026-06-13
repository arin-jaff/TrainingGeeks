/**
 * Resolve the thresholds in effect on a date into the estimator's shape, for
 * one modality or all of them. Server-only (reads the threshold table); used by
 * the builder pages and the schedule/save actions.
 */

import type { DB } from "../db/client.js";
import { getEffectiveThreshold } from "../db/repo.js";
import { MODALITIES, modalityToCurve, type Modality } from "../db/types.js";
import type { EstimateThresholds } from "./estimate.js";

export function resolveThresholds(db: DB, modality: Modality, date: string): EstimateThresholds {
  const curve = modalityToCurve(modality);
  return {
    ftp: modality === "bike" ? (getEffectiveThreshold(db, "bike", "ftp", date) ?? null) : null,
    thresholdSpeed: getEffectiveThreshold(db, curve, "threshold_pace", date) ?? null,
    thresholdHr:
      getEffectiveThreshold(db, curve, "threshold_hr", date) ??
      getEffectiveThreshold(db, "run", "threshold_hr", date) ??
      null,
  };
}

export function resolveThresholdsMap(db: DB, date: string): Record<Modality, EstimateThresholds> {
  const map = {} as Record<Modality, EstimateThresholds>;
  for (const m of MODALITIES) map[m] = resolveThresholds(db, m, date);
  return map;
}
