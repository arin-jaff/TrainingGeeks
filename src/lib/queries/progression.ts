import type { DB } from "../db/client.js";
import { listActivitiesBetween, listPaceEfforts } from "../db/repo.js";
import { isCardio, type Modality } from "../db/types.js";

export interface ProgressionActivity {
  date: string;
  modality: Modality;
  durationS: number;
  distanceM: number;
  load: number; // TSS for cardio, S³ for strength
  elevationM: number;
}

export interface BestEffort {
  label: string;
  value: string;
  date: string | null;
}

export interface ProgressionData {
  activities: ProgressionActivity[];
  bests: BestEffort[];
}

const PB_DISTANCES: [number, string][] = [
  [400, "400 m"],
  [1000, "1 km"],
  [1609.34, "1 mi"],
  [5000, "5 km"],
  [10000, "10 km"],
  [21097.5, "Half Marathon"],
];

function fmtDur(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, "0")}` : `${mm}:${String(sec).padStart(2, "0")}`;
}

export function getProgressionData(db: DB, units: string): ProgressionData {
  const rows = listActivitiesBetween(db, "0000-01-01", "9999-12-31");
  const per = units === "imperial" ? 1609.34 : 1000;
  const distUnit = units === "imperial" ? "mi" : "km";
  const elevFactor = units === "imperial" ? 3.28084 : 1;
  const elevUnit = units === "imperial" ? "ft" : "m";

  const activities: ProgressionActivity[] = rows.map((a) => {
    const m = a.modality as Modality;
    return {
      date: a.local_date,
      modality: m,
      durationS: a.duration_s ?? 0,
      distanceM: a.distance_m ?? 0,
      load: (isCardio(m) ? a.tss : a.s3) ?? 0,
      elevationM: a.elevation_gain_m ?? 0,
    };
  });

  // ---- All-time personal bests ----
  const bests: BestEffort[] = [];
  const maxBy = <T,>(arr: T[], f: (t: T) => number | null) =>
    arr.reduce<T | null>((best, x) => {
      const v = f(x);
      return v != null && (best == null || v > (f(best) ?? -Infinity)) ? x : best;
    }, null);

  const cardio = rows.filter((a) => isCardio(a.modality as Modality));
  const ld = maxBy(rows, (a) => a.distance_m);
  if (ld?.distance_m)
    bests.push({ label: "Longest Distance", value: `${(ld.distance_m / per).toFixed(1)} ${distUnit}`, date: ld.local_date });
  const ldur = maxBy(rows, (a) => a.duration_s);
  if (ldur?.duration_s)
    bests.push({ label: "Longest Duration", value: fmtDur(ldur.duration_s), date: ldur.local_date });
  const mt = maxBy(rows, (a) => a.tss);
  if (mt?.tss) bests.push({ label: "Most TSS (workout)", value: String(Math.round(mt.tss)), date: mt.local_date });
  const mw = maxBy(rows, (a) => a.kj);
  if (mw?.kj) bests.push({ label: "Most Work", value: `${Math.round(mw.kj)} kJ`, date: mw.local_date });
  const mhr = maxBy(cardio, (a) => a.max_hr);
  if (mhr?.max_hr) bests.push({ label: "Max Heart Rate", value: `${Math.round(mhr.max_hr)} bpm`, date: mhr.local_date });
  const mnp = maxBy(rows, (a) => a.np);
  if (mnp?.np) bests.push({ label: "Best NP", value: `${Math.round(mnp.np)} W`, date: mnp.local_date });
  const elev = maxBy(rows, (a) => a.elevation_gain_m);
  if (elev?.elevation_gain_m)
    bests.push({ label: "Most Elevation", value: `${Math.round(elev.elevation_gain_m * elevFactor)} ${elevUnit}`, date: elev.local_date });

  // Best pace efforts by distance (running)
  const efforts = listPaceEfforts(db).filter((e) => (e.modality as Modality) === "run");
  const bestByWindow = new Map<number, { speed: number; date: string }>();
  for (const e of efforts) {
    const cur = bestByWindow.get(e.window);
    if (!cur || e.speed > cur.speed) bestByWindow.set(e.window, { speed: e.speed, date: e.date });
  }
  for (const [w, label] of PB_DISTANCES) {
    const b = bestByWindow.get(w);
    if (b) bests.push({ label: `Fastest ${label}`, value: fmtDur(w / b.speed), date: b.date });
  }

  return { activities, bests };
}
