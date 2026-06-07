import type { Modality } from "../db/types.js";

export const MODALITY_COLOR: Record<Modality, string> = {
  run: "#2f9e6b",
  bike: "#2f6fed",
  swim: "#16a0c8",
  lift: "#8b5cf6",
  core: "#d97706",
};

// Performance Management Chart series colors (match TrainingPeaks PMC).
export const PMC_COLOR = {
  stress: "#cbd5e1", // daily TSS bars
  ctl: "#2f6fed", // Fitness (blue)
  atl: "#e0457b", // Fatigue (magenta/pink, like TP)
  tsb: "#f0a03f", // Form (orange)
};
