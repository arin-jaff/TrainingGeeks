import { randomBytes } from "node:crypto";
import type { DB } from "../db/client.js";
import {
  getAthlete,
  getShareLink,
  getShareLinkForActivity,
  insertShareLink,
} from "../db/repo.js";
import type { Modality, Units } from "../db/types.js";
import { formatDistance, formatDuration, MODALITY_LABEL } from "../util/format.js";
import { getActivityDetail, type SplitRow } from "./activity.js";

/**
 * Mint the public token for an activity, or return the one it already has —
 * one live link per activity, so re-sharing never leaves an orphan URL alive.
 * 128 bits from the CSPRNG: the token is the only credential for the page, so
 * it must be unguessable and carry no relation to the activity id.
 */
export function createShareLink(db: DB, activityId: number): string {
  const existing = getShareLinkForActivity(db, activityId);
  if (existing) return existing.token;
  const token = randomBytes(16).toString("base64url");
  insertShareLink(db, activityId, token);
  return token;
}

/**
 * The ENTIRE public surface of a share link.
 *
 * Everything in this shape is rendered at /share/<token> for anyone holding
 * the URL, so it is a strict allow-list assembled field by field — never a
 * spread of ActivityRow. Deliberately absent: private_notes, RPE, the
 * activity id, fit_hash/raw_path/source, attachments, the athlete
 * (name/email/settings), and every other activity in the database.
 */
export interface SharedActivity {
  name: string | null;
  modality: Modality;
  localDate: string; // YYYY-MM-DD
  /** Display preference only — which units the numbers are rendered in. */
  units: Units;
  /** The activity's public description (`notes`), not the private notes. */
  description: string | null;
  durationS: number | null;
  distanceM: number | null;
  elevationGainM: number | null;
  avgSpeedMps: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPower: number | null;
  maxPower: number | null;
  np: number | null;
  avgCadence: number | null;
  calories: number | null;
  kj: number | null;
  tss: number | null;
  s3: number | null;
  intensityFactor: number | null;
  /** Stream min/max for the min-avg-max table. */
  minHr: number | null;
  minSpeed: number | null;
  maxSpeed: number | null;
  hasGps: boolean;
  // ponytail: the GPS track is shared whole — no privacy-zone trimming around
  // the start/end. Add a radius setting + coordinate clipping here if home
  // addresses need hiding.
  stream: {
    time: number[];
    lat: (number | null)[];
    lng: (number | null)[];
    alt: (number | null)[];
    hr: (number | null)[];
    power: (number | null)[];
    speed: (number | null)[];
  } | null;
  laps: SplitRow[];
  autoSplits: SplitRow[];
  splitUnitLabel: string;
  hrZoneAnchor: number | null;
}

/**
 * Resolve a public token to its one shared activity. Returns null for unknown
 * or revoked tokens — callers turn that into a 404.
 */
export function getSharedActivity(db: DB, token: string): SharedActivity | null {
  const link = getShareLink(db, token);
  if (!link) return null;
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const detail = getActivityDetail(db, link.activity_id, units);
  if (!detail) return null;
  const a = detail.activity;
  return {
    name: a.name,
    modality: a.modality,
    localDate: a.local_date,
    units,
    description: a.notes,
    durationS: a.duration_s,
    distanceM: a.distance_m,
    elevationGainM: a.elevation_gain_m,
    avgSpeedMps: a.avg_speed_mps,
    avgHr: a.avg_hr,
    maxHr: a.max_hr,
    avgPower: a.avg_power,
    maxPower: a.max_power,
    np: a.np,
    avgCadence: a.avg_cadence,
    calories: a.calories,
    kj: a.kj,
    tss: a.tss,
    s3: a.s3,
    intensityFactor: a.intensity_factor,
    minHr: detail.minHr,
    minSpeed: detail.minSpeed,
    maxSpeed: detail.maxSpeed,
    hasGps: detail.hasGps,
    stream: detail.stream,
    laps: detail.laps,
    autoSplits: detail.autoSplits,
    splitUnitLabel: detail.splitUnitLabel,
    hrZoneAnchor: detail.hrZoneAnchor,
  };
}

/** One-line summary used for the page subtitle and the OG description. */
export function shareSummary(s: SharedActivity): string {
  const parts = [MODALITY_LABEL[s.modality]];
  if (s.distanceM) parts.push(formatDistance(s.distanceM, s.units));
  if (s.durationS) parts.push(formatDuration(s.durationS));
  const stress = s.modality === "lift" || s.modality === "core" ? s.s3 : s.tss;
  if (stress != null) {
    parts.push(
      `${Math.round(stress)} ${s.modality === "lift" || s.modality === "core" ? "S³" : "TSS"}`,
    );
  }
  return parts.join(" · ");
}
