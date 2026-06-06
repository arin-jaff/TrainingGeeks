export {
  computeCardioMetrics,
  type CardioMetrics,
  type CardioThresholds,
  type TssMethod,
} from "./cardio.js";
export {
  computePeaks,
  durationPeaks,
  distancePeaks,
  PEAK_DURATIONS_S,
  PEAK_DISTANCES_M,
  type DurationPeak,
  type DistancePeak,
} from "./peaks.js";
export {
  resampleTo1Hz,
  movingAverage,
  normalizedValue,
  mean,
} from "./series.js";
export { gradeFactor, gradeAdjustedSpeed1Hz } from "./grade.js";
