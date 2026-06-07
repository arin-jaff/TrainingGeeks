/**
 * Curated wellness / body-metric types for manual logging and trends.
 * Inspired by OpenAthlete's AthleteMetric model (reimplemented). Higher = better
 * controls chart coloring for subjective scores.
 */
export interface WellnessType {
  id: string;
  label: string;
  unit: string;
  group: "Body" | "Cardiac" | "Sleep" | "Subjective" | "Performance";
  decimals: number;
  min?: number;
  max?: number;
}

export const WELLNESS_TYPES: WellnessType[] = [
  { id: "weight", label: "Weight", unit: "kg", group: "Body", decimals: 1 },
  { id: "body_fat", label: "Body Fat", unit: "%", group: "Body", decimals: 1 },
  { id: "resting_hr", label: "Resting HR", unit: "bpm", group: "Cardiac", decimals: 0 },
  { id: "hrv", label: "HRV (RMSSD)", unit: "ms", group: "Cardiac", decimals: 0 },
  { id: "vo2max", label: "VO₂max", unit: "ml/kg/min", group: "Performance", decimals: 1 },
  { id: "blood_pressure_sys", label: "Blood Pressure (sys)", unit: "mmHg", group: "Cardiac", decimals: 0 },
  { id: "sleep_hours", label: "Sleep Duration", unit: "h", group: "Sleep", decimals: 1 },
  { id: "sleep_score", label: "Sleep Score", unit: "/100", group: "Sleep", decimals: 0, min: 0, max: 100 },
  { id: "body_battery", label: "Body Battery", unit: "/100", group: "Body", decimals: 0, min: 0, max: 100 },
  { id: "stress", label: "Stress", unit: "/100", group: "Body", decimals: 0, min: 0, max: 100 },
  // Subjective (Hooper-index style), 1 (poor) – 5 (great)
  { id: "mood", label: "Mood", unit: "1–5", group: "Subjective", decimals: 0, min: 1, max: 5 },
  { id: "fatigue", label: "Fatigue", unit: "1–5", group: "Subjective", decimals: 0, min: 1, max: 5 },
  { id: "soreness", label: "Soreness", unit: "1–5", group: "Subjective", decimals: 0, min: 1, max: 5 },
  { id: "motivation", label: "Motivation", unit: "1–5", group: "Subjective", decimals: 0, min: 1, max: 5 },
];

export const WELLNESS_BY_ID: Record<string, WellnessType> = Object.fromEntries(
  WELLNESS_TYPES.map((t) => [t.id, t]),
);
