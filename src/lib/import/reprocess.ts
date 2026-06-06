import type { DB } from "../db/client.js";
import {
  getActivityStream,
  getAthlete,
  getEffectiveThreshold,
  listActivitiesBetween,
  updateActivityMetrics,
} from "../db/repo.js";
import { modalityToCurve, type Modality } from "../db/types.js";
import type { NormalizedActivity, StreamChannels } from "../fit/types.js";
import { computeCardioMetrics } from "../metrics/cardio.js";
import { computeS3 } from "../metrics/strength.js";
import { recomputeFitness } from "../fitness/recompute.js";
import type { ActivityRow } from "../db/types.js";

const EMPTY_CHANNELS: StreamChannels = {
  time: [],
  lat: [],
  lng: [],
  alt: [],
  hr: [],
  power: [],
  cadence: [],
  speed: [],
  distance: [],
  temp: [],
};

function toNormalized(row: ActivityRow, channels: StreamChannels): NormalizedActivity {
  return {
    sport: row.sport_detail,
    subSport: null,
    modality: row.modality,
    startTime: row.start_time,
    fitHash: row.fit_hash ?? "",
    summary: {
      durationS: row.duration_s,
      elapsedS: row.elapsed_s,
      distanceM: row.distance_m,
      elevationGainM: row.elevation_gain_m,
      avgHr: row.avg_hr,
      maxHr: row.max_hr,
      avgPower: row.avg_power,
      maxPower: row.max_power,
      np: row.np,
      avgSpeedMps: row.avg_speed_mps,
      maxSpeedMps: row.max_speed_mps,
      avgCadence: row.avg_cadence,
      maxCadence: row.max_cadence,
      calories: row.calories,
      kj: row.kj,
    },
    channels,
    laps: [],
    sessions: [],
  };
}

/**
 * Recompute metrics for every activity from its stored stream using the
 * thresholds in effect on each activity's date, then rebuild fitness. Run
 * after editing thresholds so existing activities reflect the change.
 */
export function reprocessAll(db: DB): number {
  const all = listActivitiesBetween(db, "0000-01-01", "9999-12-31");
  const athlete = getAthlete(db);
  let count = 0;

  for (const row of all) {
    const modality = row.modality as Modality;
    const curve = modalityToCurve(modality);
    const date = row.local_date;
    const thresholds = {
      ftp:
        modality === "bike"
          ? (getEffectiveThreshold(db, "bike", "ftp", date) ?? null)
          : null,
      thresholdSpeed:
        getEffectiveThreshold(db, curve, "threshold_pace", date) ?? null,
      thresholdHr:
        getEffectiveThreshold(db, curve, "threshold_hr", date) ??
        getEffectiveThreshold(db, "run", "threshold_hr", date) ??
        null,
    };

    const stream = (getActivityStream(db, row.id) as StreamChannels | undefined) ?? EMPTY_CHANNELS;
    const normalized = toNormalized(row, stream);
    const cardio = computeCardioMetrics(normalized, thresholds);

    const isStrength = modality === "lift" || modality === "core";
    const s3 = isStrength
      ? computeS3(row.duration_s ?? 0, row.rpe ?? athlete?.strength_rpe_default ?? 5)
      : null;

    updateActivityMetrics(db, row.id, {
      np: cardio.np,
      tss: cardio.tss,
      s3,
      intensity_factor: cardio.intensityFactor,
      variability_index: cardio.variabilityIndex,
      efficiency_factor: cardio.efficiencyFactor,
      decoupling: cardio.decoupling,
    });
    count++;
  }

  recomputeFitness(db);
  return count;
}
