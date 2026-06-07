/**
 * Zone auto-calculation method catalogs, mirrored from TrainingPeaks.
 * The number in parentheses is how many zones the method produces. The actual
 * band math lives in the calculation engine (built later from
 * references/zones/*.xlsx); these drive the Settings dropdowns for now.
 */

export interface ZoneMethod {
  id: string;
  label: string; // includes zone count, e.g. "Andy Coggan (6)"
  zones: number;
}

const m = (label: string, zones: number): ZoneMethod => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  label: `${label} (${zones})`,
  zones,
});

// ---- Power ----
export const POWER_TYPES = ["Threshold Power"] as const;
export const POWER_METHODS: Record<string, ZoneMethod[]> = {
  "Threshold Power": [
    m("Andy Coggan", 6),
    m("Durata Training", 8),
    m("CTS", 6),
    m("USAT for Cycling", 6),
    m("80/20 Running", 7),
    m("80/20 Cycling", 7),
    m("MyProCoach Cycling", 5),
    m("MyProCoach Running", 5),
    m("Stryd Running", 5),
  ],
};

// ---- Heart Rate ----
export const HR_TYPES = [
  "Lactate Threshold",
  "Maximum Heart Rate",
] as const;
export const HR_METHODS: Record<string, ZoneMethod[]> = {
  "Lactate Threshold": [
    m("Joe Friel", 7),
    m("Joe Friel for Running", 7),
    m("Joe Friel for Cycling", 7),
    m("Andy Coggan", 5),
    m("USAC", 5),
    m("USAT for Cycling", 6),
    m("USAT for Running", 6),
    m("CycleSmart", 5),
    m("Durata Training", 10),
    m("CTS Cycling", 6),
    m("CTS Run", 5),
    m("80/20 Running", 7),
    m("80/20 Cycling", 7),
    m("MyProCoach Running", 5),
    m("MyProCoach Cycling", 5),
  ],
  "Maximum Heart Rate": [
    m("BCF/ABCC/WCPP Revised", 7),
    m("Peter Keen", 4),
    m("Ric Stern", 7),
    m("Sally Edwards", 5),
    m("Timex", 5),
    m("Timex Manual Entry", 1),
    m("MyProCoach", 5),
  ],
};

// ---- Pace ----
export const PACE_TYPES = ["Threshold Pace"] as const;
export const PACE_METHODS: Record<string, ZoneMethod[]> = {
  "Threshold Pace": [
    m("Joe Friel for Running", 7),
    m("80/20 Running", 7),
    m("PZI Running", 5),
    m("VDOT", 5),
    m("MyProCoach Running", 5),
  ],
};

export interface ZoneRow {
  name: string;
  low: number | "";
  high: number | "";
}

// Default zone sets shown before any calculation (editable).
export const DEFAULT_HR_ZONES: ZoneRow[] = [
  { name: "Zone 1: Active Recovery", low: 0, high: 123 },
  { name: "Zone 2: Aerobic Capacity", low: 124, high: 150 },
  { name: "Zone 3: Tempo", low: 151, high: 170 },
  { name: "Zone 4: Threshold", low: 171, high: 189 },
  { name: "Zone 5: VO2 Max", low: 190, high: 255 },
];

export const DEFAULT_POWER_ZONES: ZoneRow[] = [
  { name: "1", low: 0, high: 173 },
  { name: "2", low: 174, high: 235 },
  { name: "3", low: 236, high: 281 },
  { name: "4", low: 282, high: 328 },
  { name: "5", low: 329, high: 374 },
  { name: "6", low: 375, high: 2000 },
];

export const DEFAULT_PACE_ZONES: ZoneRow[] = [
  { name: "Zone 1", low: 0, high: 0 },
  { name: "Zone 2", low: 0, high: 0 },
  { name: "Zone 3", low: 0, high: 0 },
  { name: "Zone 4", low: 0, high: 0 },
  { name: "Zone 5", low: 0, high: 0 },
];

export const ADD_ACTIVITY_OPTIONS = [
  "Swim",
  "Bike",
  "Run",
  "Row",
  "Other",
] as const;
