import type { DB } from "../db/client.js";
import {
  getActivity,
  getActivityStream,
  listActivityPeaks,
} from "../db/repo.js";
import type { ActivityRow } from "../db/types.js";

export interface DurationPeakView {
  window: number;
  value: number;
}
export interface DistancePeakView {
  window: number;
  speed: number;
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
}

export function getActivityDetail(
  db: DB,
  id: number,
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

  return { activity, stream, hasGps, powerPeaks, pacePeaks };
}
