import type { Modality } from "../db/types.js";

// Per-modality accent colors, measured from TrainingPeaks.
export const MODALITY_COLOR: Record<Modality, string> = {
  run: "#45ae01",
  bike: "#2f6fed",
  swim: "#16a0c8",
  lift: "#7b2d8e",
  core: "#a42ddb",
};

// Fitness / Fatigue / Form text colors (TP calendar summary + PMC).
export const FITNESS_COLOR = "#1840ec"; // Fitness / CTL (blue)
export const FATIGUE_COLOR = "#e63788"; // Fatigue / ATL (magenta)
export const FORM_COLOR = "#fd6b00"; // Form / TSB (orange)

// Discipline duration bars in the weekly summary (TP exact).
export const DISCIPLINE_BAR: Record<string, string> = {
  run: "#45ae01",
  bike: "#2f6fed",
  swim: "#16a0c8",
  strength: "#3b0a52",
  other: "#a42ddb",
};

// Calendar workout status banners (TP compliance colors).
// Completed → green; planned & past-due → red; planned & upcoming → grey.
export const STATUS_COMPLETE = "#8bc53f"; // green banner (completed)
export const STATUS_COMPLETE_BG = "#f3f9ec"; // faint green card body
export const STATUS_PASTDUE = "#e2574c"; // red banner (past-due planned)
export const STATUS_PASTDUE_BG = "#fdecea"; // faint red card body

// Performance Management Chart series colors.
export const PMC_COLOR = {
  stress: "#cbd5e1", // daily TSS bars
  ctl: FITNESS_COLOR, // Fitness (blue)
  atl: FATIGUE_COLOR, // Fatigue (magenta)
  tsb: FORM_COLOR, // Form (orange)
};
