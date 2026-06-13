import type { DB } from "../db/client.js";
import {
  getActivity,
  getActivityStream,
  getEffectiveThreshold,
  listActivityPeaks,
  listLaps,
} from "../db/repo.js";
import type { ActivityRow, Units } from "../db/types.js";
import { isCardio, modalityToCurve } from "../db/types.js";
import { computeSplits } from "../metrics/splits.js";

export interface DurationPeakView {
  window: number;
  value: number;
}
export interface DistancePeakView {
  window: number;
  speed: number;
}

/** A lap or auto-split row, normalized for the splits table. */
export interface SplitRow {
  distanceM: number | null;
  durationS: number | null;
  avgSpeedMps: number | null;
  avgHr: number | null;
  avgPower: number | null;
}

export interface ActivityDetail {
  activity: ActivityRow;
  stream: {
    time: number[];
    lat: (number | null)[];
    lng: (number | null)[];
    alt: (number | null)[];
    hr: (number | null)[];
    power: (number | null)[];
    speed: (number | null)[];
  } | null;
  hasGps: boolean;
  powerPeaks: DurationPeakView[];
  pacePeaks: DistancePeakView[];
  minHr: number | null;
  maxHr: number | null;
  minSpeed: number | null; // slowest moving speed (m/s)
  maxSpeed: number | null; // fastest speed (m/s)
  laps: SplitRow[]; // device-recorded laps
  autoSplits: SplitRow[]; // even mi/km/100m splits from the stream
  splitUnitLabel: string; // "1 mi" | "1 km" | "100 m"
  /** Max-HR anchor for zone coloring (configured threshold or activity max). */
  hrZoneAnchor: number | null;
}

export function getActivityDetail(
  db: DB,
  id: number,
  units: Units = "imperial",
): ActivityDetail | null {
  const activity = getActivity(db, id);
  if (!activity) return null;

  const raw = getActivityStream(db, id);
  const stream = raw
    ? {
        time: (raw.time ?? []).map((v) => v ?? 0),
        lat: raw.lat ?? [],
        lng: raw.lng ?? [],
        alt: raw.alt ?? [],
        hr: raw.hr ?? [],
        power: raw.power ?? [],
        speed: raw.speed ?? [],
      }
    : null;
  const hasGps = !!stream?.lat.some((v) => v !== null);

  const peaks = listActivityPeaks(db, id);
  const powerPeaks = peaks
    .filter((p) => p.kind === "power" && p.basis === "duration")
    .map((p) => ({ window: p.window, value: p.value }));
  const pacePeaks = peaks
    .filter((p) => p.kind === "pace" && p.basis === "distance")
    .map((p) => ({ window: p.window, speed: p.value }));

  // Min/Max from the stream (ignore nulls and non-moving zeros).
  let minHr: number | null = null,
    maxHr: number | null = null,
    minSpeed: number | null = null,
    maxSpeed: number | null = null;
  if (stream) {
    for (const v of stream.hr) {
      if (v == null || v <= 0) continue;
      minHr = minHr == null ? v : Math.min(minHr, v);
      maxHr = maxHr == null ? v : Math.max(maxHr, v);
    }
    for (const v of stream.speed) {
      if (v == null || v <= 0.3) continue; // ignore standing
      minSpeed = minSpeed == null ? v : Math.min(minSpeed, v);
      maxSpeed = maxSpeed == null ? v : Math.max(maxSpeed, v);
    }
  }

  // Splits only make sense for cardio with distance.
  const cardio = isCardio(activity.modality);
  const modality = activity.modality;

  const lapRows = cardio ? listLaps(db, id) : [];
  const laps: SplitRow[] = lapRows.map((l) => ({
    distanceM: l.distance_m,
    durationS: l.duration_s,
    avgSpeedMps:
      l.avg_speed_mps ??
      (l.distance_m && l.duration_s ? l.distance_m / l.duration_s : null),
    avgHr: l.avg_hr,
    avgPower: l.avg_power,
  }));

  const splitUnitMeters = modality === "swim" ? 100 : units === "imperial" ? 1609.34 : 1000;
  const splitUnitLabel = modality === "swim" ? "100 m" : units === "imperial" ? "1 mi" : "1 km";
  const autoSplits: SplitRow[] =
    cardio && raw
      ? computeSplits(
          {
            time: raw.time ?? [],
            distance: raw.distance ?? [],
            hr: raw.hr ?? [],
            power: raw.power ?? [],
            speed: raw.speed ?? [],
          },
          splitUnitMeters,
        )
      : [];

  const hrZoneAnchor =
    getEffectiveThreshold(db, modalityToCurve(modality), "max_hr", activity.local_date) ??
    activity.max_hr ??
    maxHr;

  return {
    activity,
    stream,
    hasGps,
    powerPeaks,
    pacePeaks,
    minHr,
    maxHr,
    minSpeed,
    maxSpeed,
    laps,
    autoSplits,
    splitUnitLabel,
    hrZoneAnchor,
  };
}
