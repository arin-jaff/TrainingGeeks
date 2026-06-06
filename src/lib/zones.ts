/**
 * Auto-calculated training zones from a threshold value, using standard
 * models (Coggan power, Friel-style HR/pace). `high: null` means open-ended.
 */

export interface Zone {
  name: string;
  low: number;
  high: number | null;
}

function bands(
  base: number,
  defs: [string, number, number | null][],
): Zone[] {
  return defs.map(([name, lo, hi]) => ({
    name,
    low: Math.round(base * lo),
    high: hi == null ? null : Math.round(base * hi),
  }));
}

export function powerZones(ftp: number): Zone[] {
  return bands(ftp, [
    ["Z1 Active Recovery", 0, 0.55],
    ["Z2 Endurance", 0.55, 0.75],
    ["Z3 Tempo", 0.75, 0.9],
    ["Z4 Threshold", 0.9, 1.05],
    ["Z5 VO2 Max", 1.05, 1.2],
    ["Z6 Anaerobic", 1.2, null],
  ]);
}

export function hrZones(thresholdHr: number): Zone[] {
  return bands(thresholdHr, [
    ["Z1 Recovery", 0, 0.81],
    ["Z2 Aerobic", 0.81, 0.89],
    ["Z3 Tempo", 0.9, 0.93],
    ["Z4 Threshold", 0.94, 0.99],
    ["Z5 VO2 Max", 1.0, null],
  ]);
}

/**
 * Pace zones expressed as SPEED bands (m/s) relative to threshold speed; the
 * UI converts each bound to a pace. Faster speed = higher zone.
 */
export function paceZones(thresholdSpeed: number): Zone[] {
  return [
    { name: "Z1 Recovery", low: 0, high: round(thresholdSpeed * 0.8) },
    { name: "Z2 Aerobic", low: round(thresholdSpeed * 0.8), high: round(thresholdSpeed * 0.87) },
    { name: "Z3 Tempo", low: round(thresholdSpeed * 0.87), high: round(thresholdSpeed * 0.94) },
    { name: "Z4 Threshold", low: round(thresholdSpeed * 0.94), high: round(thresholdSpeed * 1.0) },
    { name: "Z5 VO2 Max", low: round(thresholdSpeed * 1.0), high: null },
  ];
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
