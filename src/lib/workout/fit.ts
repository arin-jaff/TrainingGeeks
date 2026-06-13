/**
 * Encode a structured workout to a Garmin-loadable FIT workout file using the
 * official @garmin/fitsdk Encoder. Copy the resulting .FIT to a watch's
 * GARMIN/NewFiles (or import via Garmin Connect / Express) and it appears as a
 * structured workout. Pure: no DB/React, just the document + an optional name.
 *
 * Field units and target conventions are the FIT profile's, verified by an
 * encode→decode round-trip in the test suite:
 *   - time duration:   durationValue = seconds × 1000
 *   - distance:        durationValue = meters  × 100
 *   - pace/speed:      customTargetValueLow/High = m/s × 1000  (targetType speed)
 *   - heart-rate bpm:  customTargetValueLow/High = bpm + 100   (targetType heartRate)
 *   - power watts:     customTargetValueLow/High = watts + 1000 (targetType power)
 *   - zone targets:    targetValue = zone number
 *   - repeat block:    durationType repeatUntilStepsCmplt, durationValue = loop-back
 *                      step index, targetValue = repeat count
 */

import { Encoder, Profile } from "@garmin/fitsdk";
import type { Modality } from "../db/types.js";
import {
  flatten,
  type SimpleStep,
  type StepTarget,
  type WorkoutStep,
} from "./template.js";

const HR_BPM_OFFSET = 100; // FIT: workout_hr ≤100 is %max, >100 is bpm+100
const POWER_W_OFFSET = 1000; // FIT: workout_power ≤1000 is %FTP, >1000 is W+1000

/** Garmin sport for a logged modality. Strength/core map to generic training. */
function fitSport(modality: Modality): string {
  switch (modality) {
    case "run":
      return "running";
    case "bike":
      return "cycling";
    case "swim":
      return "swimming";
    case "row":
      return "rowing";
    case "lift":
    case "core":
      return "training";
  }
}

interface StepFields {
  durationType: string;
  durationValue: number;
  targetType: string;
  targetValue: number;
  customTargetValueLow?: number;
  customTargetValueHigh?: number;
}

function durationFields(step: SimpleStep): Pick<StepFields, "durationType" | "durationValue"> {
  switch (step.durationKind) {
    case "time":
      return { durationType: "time", durationValue: Math.round((step.durationValue ?? 0) * 1000) };
    case "distance":
      return { durationType: "distance", durationValue: Math.round((step.durationValue ?? 0) * 100) };
    case "lapButton":
      return { durationType: "open", durationValue: 0 };
  }
}

function targetFields(
  t: StepTarget,
): Pick<StepFields, "targetType" | "targetValue" | "customTargetValueLow" | "customTargetValueHigh"> {
  const bounds = (lo: number, hi: number) => ({ customTargetValueLow: lo, customTargetValueHigh: hi });
  const range = (
    low: number | null | undefined,
    high: number | null | undefined,
    xform: (v: number) => number,
  ) => {
    const a = low != null && Number.isFinite(low) ? low : high;
    const b = high != null && Number.isFinite(high) ? high : low;
    return bounds(xform(a as number), xform(b as number));
  };

  switch (t.kind) {
    case "pace":
      return { targetType: "speed", targetValue: 0, ...range(t.low, t.high, (v) => Math.round(v * 1000)) };
    case "hr":
      return {
        targetType: "heartRate",
        targetValue: 0,
        ...range(t.low, t.high, (v) => Math.round(v) + HR_BPM_OFFSET),
      };
    case "hrZone":
      return { targetType: "heartRate", targetValue: Math.round(t.low ?? 0) };
    case "power":
      return {
        targetType: "power",
        targetValue: 0,
        ...range(t.low, t.high, (v) => Math.round(v) + POWER_W_OFFSET),
      };
    case "powerZone":
      return { targetType: "power", targetValue: Math.round(t.low ?? 0) };
    case "cadence":
      return { targetType: "cadence", targetValue: 0, ...range(t.low, t.high, (v) => Math.round(v)) };
    case "none":
      return { targetType: "open", targetValue: 0 };
  }
}

export interface FitWorkoutInput {
  name: string;
  modality: Modality;
  steps: WorkoutStep[];
}

/**
 * The Encoder writes any named profile field present on the message object, but
 * its public type only declares `mesgNum`. This shape carries the dynamic FIT
 * fields; the cast at the call site is the one place we bridge to the SDK type.
 */
type FitMesg = { mesgNum: number } & Record<string, number | string | Date>;

function put(enc: Encoder, mesg: FitMesg): void {
  enc.writeMesg(mesg as unknown as Parameters<Encoder["writeMesg"]>[0]);
}

/**
 * Encode the workout to FIT bytes. Throws if the workout has no steps (an empty
 * FIT workout is rejected by watches).
 */
export function encodeWorkoutFit(input: FitWorkoutInput): Uint8Array {
  const flat = flatten(input.steps);
  if (flat.length === 0) throw new Error("Cannot export an empty workout");

  const M = Profile.MesgNum;
  const enc = new Encoder();

  put(enc, {
    mesgNum: M.FILE_ID,
    type: "workout",
    manufacturer: 255, // development / unknown
    product: 0,
    timeCreated: new Date(),
    serialNumber: 0,
  });

  put(enc, {
    mesgNum: M.WORKOUT,
    wktName: (input.name || "Workout").slice(0, 50),
    sport: fitSport(input.modality),
    capabilities: 32, // tcx — custom target ranges supported
    numValidSteps: flat.length,
  });

  flat.forEach((entry, index) => {
    if (entry.type === "repeat") {
      put(enc, {
        mesgNum: M.WORKOUT_STEP,
        messageIndex: index,
        durationType: "repeatUntilStepsCmplt",
        durationValue: entry.fromIndex,
        targetType: "open",
        targetValue: entry.count,
      });
      return;
    }
    const step = entry.step;
    put(enc, {
      mesgNum: M.WORKOUT_STEP,
      messageIndex: index,
      ...(step.name ? { wktStepName: step.name.slice(0, 50) } : {}),
      intensity: step.intensity,
      ...durationFields(step),
      ...targetFields(step.target),
      ...(step.notes ? { notes: step.notes.slice(0, 50) } : {}),
    });
  });

  return enc.close();
}

/** A filesystem-safe filename for a workout's FIT export. */
export function fitFilename(name: string): string {
  const base = (name || "workout").trim().replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "_");
  return `${base || "workout"}.fit`;
}
