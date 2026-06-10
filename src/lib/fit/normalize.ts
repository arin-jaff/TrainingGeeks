import type { Modality } from "../db/types.js";
import { contentHash } from "./hash.js";
import { decodeFit } from "./parse.js";
import type {
  NormalizedActivity,
  NormalizedLap,
  NormalizedSession,
  NormalizedStrengthSet,
  StreamChannels,
} from "./types.js";

/**
 * Parse FIT `setMesgs` into active strength sets, folding each set's trailing
 * `rest` set into restS. The FIT `category` is an array (often padded with
 * "unknown"); we take the first meaningful value as the exercise key.
 */
export function parseStrengthSets(setsRaw: Msg[]): NormalizedStrengthSet[] {
  const out: NormalizedStrengthSet[] = [];
  let idx = 0;
  for (let i = 0; i < setsRaw.length; i++) {
    const s = setsRaw[i];
    if (String(s.setType) !== "active") continue;
    const next = setsRaw[i + 1];
    const restS = next && String(next.setType) === "rest" ? num(next.duration) : null;
    const cat = Array.isArray(s.category)
      ? (s.category.find((c) => c && c !== "unknown") as string | undefined) ?? "unknown"
      : (s.category as string | undefined) ?? "unknown";
    const w = num(s.weight);
    out.push({
      setIndex: idx++,
      exerciseKey: String(cat),
      reps: num(s.repetitions),
      durationS: num(s.duration),
      restS,
      weightKg: w != null && w > 0 ? w : null,
    });
  }
  return out;
}

const SEMI_TO_DEG = 180 / 2 ** 31;
const SPEED_SENTINEL = 65.535; // 16-bit invalid speed marker (m/s)

type Msg = Record<string, unknown>;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function validSpeed(v: unknown): number | null {
  const n = num(v);
  return n === null || n >= SPEED_SENTINEL ? null : n;
}

function semi(v: unknown): number | null {
  const n = num(v);
  return n === null ? null : n * SEMI_TO_DEG;
}

function toIso(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  return null;
}

/** Map FIT sport/subSport to one of the five logged modalities. */
export function mapSportToModality(
  sport: unknown,
  subSport: unknown,
): Modality {
  const s = String(sport ?? "").toLowerCase();
  const sub = String(subSport ?? "").toLowerCase();
  if (s === "running" || s === "walking" || s === "hiking") return "run";
  if (s === "cycling") return "bike";
  if (s === "swimming") return "swim";
  if (s === "rowing" || sub.includes("rowing")) return "row";
  if (sub.includes("strength")) return "lift";
  if (sub.includes("core") || sub.includes("flexibility") || sub.includes("yoga"))
    return "core";
  if (s === "training" || s === "fitnessequipment") return "lift";
  // Fallback: anything with cardio-ish movement defaults to run, else lift.
  return "lift";
}

function firstSpeed(m: Msg, enhanced: string, plain: string): number | null {
  return validSpeed(m[enhanced]) ?? validSpeed(m[plain]);
}

export function normalizeDecoded(
  messages: Record<string, Msg[] | undefined>,
  bytes: Uint8Array,
): NormalizedActivity {
  const sessionsRaw = messages.sessionMesgs ?? [];
  const recordsRaw = messages.recordMesgs ?? [];
  const lapsRaw = messages.lapMesgs ?? [];
  const fileId = (messages.fileIdMesgs ?? [])[0] ?? {};
  const s0 = sessionsRaw[0] ?? {};

  const sport = (s0.sport as string) ?? (messages.sportMesgs?.[0]?.sport as string) ?? null;
  const subSport = (s0.subSport as string) ?? null;
  const modality = mapSportToModality(sport, subSport);

  // Start time: session start -> first record -> file creation.
  const startDate =
    toIso(s0.startTime) ??
    toIso(recordsRaw[0]?.timestamp) ??
    toIso(fileId.timeCreated) ??
    new Date(0).toISOString();
  const startMs = new Date(startDate).getTime();

  // ---- Channels ----
  const channels: StreamChannels = {
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
  for (const r of recordsRaw) {
    const ts = r.timestamp instanceof Date ? r.timestamp.getTime() : null;
    channels.time.push(ts === null ? null : (ts - startMs) / 1000);
    channels.lat.push(semi(r.positionLat));
    channels.lng.push(semi(r.positionLong));
    channels.alt.push(num(r.enhancedAltitude) ?? num(r.altitude));
    channels.hr.push(num(r.heartRate));
    channels.power.push(num(r.power));
    channels.cadence.push(num(r.cadence));
    channels.speed.push(validSpeed(r.enhancedSpeed) ?? validSpeed(r.speed));
    channels.distance.push(num(r.distance));
    channels.temp.push(num(r.temperature));
  }

  // ---- Summary (prefer session, fall back to records) ----
  const lastDist = num(recordsRaw[recordsRaw.length - 1]?.distance);
  const summary = {
    durationS: num(s0.totalTimerTime),
    elapsedS: num(s0.totalElapsedTime),
    distanceM: num(s0.totalDistance) ?? lastDist,
    elevationGainM: num(s0.totalAscent),
    avgHr: num(s0.avgHeartRate),
    maxHr: num(s0.maxHeartRate),
    avgPower: num(s0.avgPower),
    maxPower: num(s0.maxPower),
    np: num(s0.normalizedPower),
    avgSpeedMps: firstSpeed(s0, "enhancedAvgSpeed", "avgSpeed"),
    maxSpeedMps: firstSpeed(s0, "enhancedMaxSpeed", "maxSpeed"),
    avgCadence: num(s0.avgCadence),
    maxCadence: num(s0.maxCadence),
    calories: num(s0.totalCalories),
    kj: num(s0.totalWork) === null ? null : (s0.totalWork as number) / 1000,
  };

  const laps: NormalizedLap[] = lapsRaw.map((l, i) => ({
    lapIndex: i,
    startTime: toIso(l.startTime),
    durationS: num(l.totalTimerTime),
    distanceM: num(l.totalDistance),
    avgHr: num(l.avgHeartRate),
    maxHr: num(l.maxHeartRate),
    avgPower: num(l.avgPower),
    maxPower: num(l.maxPower),
    np: num(l.normalizedPower),
    avgSpeedMps: firstSpeed(l, "enhancedAvgSpeed", "avgSpeed"),
    avgCadence: num(l.avgCadence),
  }));

  const sessions: NormalizedSession[] = sessionsRaw.map((sess, i) => ({
    sessionIndex: i,
    sport: (sess.sport as string) ?? null,
    startTime: toIso(sess.startTime),
    durationS: num(sess.totalTimerTime),
    distanceM: num(sess.totalDistance),
    avgHr: num(sess.avgHeartRate),
    avgPower: num(sess.avgPower),
    np: num(sess.normalizedPower),
  }));

  return {
    sport,
    subSport,
    modality,
    startTime: startDate,
    fitHash: contentHash(bytes),
    summary,
    channels,
    laps,
    sessions,
    sets: parseStrengthSets(messages.setMesgs ?? []),
  };
}

/** Decode + normalize FIT bytes (raw or gzipped) into a NormalizedActivity. */
export function normalizeFit(input: Uint8Array | Buffer): NormalizedActivity {
  const { messages, bytes } = decodeFit(input);
  return normalizeDecoded(messages, bytes);
}
