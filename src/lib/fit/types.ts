import type { Modality } from "../db/types.js";

/** Columnar time-series. Arrays are index-aligned; null = sample missing. */
export interface StreamChannels {
  time: (number | null)[]; // seconds from start
  lat: (number | null)[]; // degrees
  lng: (number | null)[]; // degrees
  alt: (number | null)[]; // meters
  hr: (number | null)[]; // bpm
  power: (number | null)[]; // watts
  cadence: (number | null)[]; // rpm (per-leg for run)
  speed: (number | null)[]; // m/s
  distance: (number | null)[]; // meters (cumulative)
  temp: (number | null)[]; // celsius
}

export interface NormalizedSummary {
  durationS: number | null; // moving/timer time
  elapsedS: number | null;
  distanceM: number | null;
  elevationGainM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPower: number | null;
  maxPower: number | null;
  np: number | null; // from device, if present
  avgSpeedMps: number | null;
  maxSpeedMps: number | null;
  avgCadence: number | null;
  maxCadence: number | null;
  calories: number | null;
  kj: number | null;
}

export interface NormalizedLap {
  lapIndex: number;
  startTime: string | null;
  durationS: number | null;
  distanceM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPower: number | null;
  maxPower: number | null;
  np: number | null;
  avgSpeedMps: number | null;
  avgCadence: number | null;
}

export interface NormalizedSession {
  sessionIndex: number;
  sport: string | null;
  startTime: string | null;
  durationS: number | null;
  distanceM: number | null;
  avgHr: number | null;
  avgPower: number | null;
  np: number | null;
}

export interface NormalizedActivity {
  sport: string | null; // raw FIT sport
  subSport: string | null;
  modality: Modality;
  startTime: string; // ISO UTC
  fitHash: string; // sha256 of decompressed FIT bytes
  summary: NormalizedSummary;
  channels: StreamChannels;
  laps: NormalizedLap[];
  sessions: NormalizedSession[];
}
