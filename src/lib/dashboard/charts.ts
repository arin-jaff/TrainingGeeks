// Shared dashboard-chart constants (kept out of the "use server" action file,
// which may only export async functions).

export const DASHBOARD_CHARTS_KEY = "dashboard_charts";

/** Canonical default chart set + order. */
export const DEFAULT_CHARTS = [
  "pmc",
  "fitness-summary",
  "duration-by-week",
  "hr-zones",
  "power-zones",
];

/** Library chart name → implemented chart id (others aren't buildable yet). */
export const IMPLEMENTED: Record<string, string> = {
  "Performance Management": "pmc",
  "Fitness Summary": "fitness-summary",
  "Duration By Week/Day": "duration-by-week",
  "Distance By Week/Day": "distance-by-week",
  "Elevation Gain By Week/Day": "elevation-by-week",
  "Kilojoules By Week/Day": "kilojoules-by-week",
  "Calories by Time Period": "calories-by-week",
  "Cardio Hours": "cardio-hours",
  "Longest Workout (Distance)": "longest-distance",
  "Longest Workout (Duration)": "longest-duration",
  "Fitness History": "fitness-history",
  "Metrics": "metrics",
  "Peak HR": "peak-hr",
  "Peak Pace": "peak-pace",
  "Peak Pace by Distance": "peak-pace-distance",
  "Peak Power": "peak-power",
  "Time In Heart Rate Zones": "hr-zones",
  "Time In Power Zones": "power-zones",
  "Lift Progression": "lift-progression",
};
