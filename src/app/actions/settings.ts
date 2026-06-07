"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import {
  getAthlete,
  replaceZones,
  setSetting,
  setThreshold,
  updateAthlete,
  upsertConnector,
} from "@/lib/db/repo";
import { reprocessAll } from "@/lib/import/reprocess";
import { todayLocal } from "@/lib/util/dates";
import type { Units } from "@/lib/db/types";

export async function saveConnector(formData: FormData): Promise<void> {
  const athleteId = String(formData.get("athleteId") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const enabled = formData.get("enabled") === "on";
  upsertConnector(getDb(), "intervals", {
    athlete_id: athleteId || null,
    api_key: apiKey || null, // blank keeps the existing key (COALESCE)
    enabled: enabled ? 1 : 0,
  });
  revalidatePath("/settings");
}

export async function updateProfile(formData: FormData): Promise<void> {
  const db = getDb();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const units = formData.get("units") === "metric" ? "metric" : "imperial";
  const timezone = String(formData.get("timezone") ?? "America/New_York").trim();
  const rpe = Number(formData.get("rpe") ?? 5);
  const dob = String(formData.get("dob") ?? "").trim();
  updateAthlete(db, {
    name: name || "Athlete",
    email: email || null,
    units: units as Units,
    timezone,
    strength_rpe_default: Number.isFinite(rpe)
      ? Math.max(1, Math.min(10, Math.round(rpe)))
      : 5,
    ...(/^\d{4}-\d{2}-\d{2}$/.test(dob) ? { dob } : {}),
  });
  revalidatePath("/settings");
  revalidatePath("/");
}

function paceToSpeed(text: string, perMeters: number): number | null {
  const m = text.trim().match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  const secs = Number(m[1]) * 60 + Number(m[2]);
  return secs > 0 ? perMeters / secs : null;
}

export async function saveThresholds(formData: FormData): Promise<void> {
  const db = getDb();
  const tz = getAthlete(db)?.timezone ?? "America/New_York";
  const today = todayLocal(tz);
  const num = (k: string) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  const ftp = num("ftp");
  if (ftp) setThreshold(db, "bike", "ftp", ftp, today);

  const runSpeed = paceToSpeed(String(formData.get("runPace") ?? ""), 1609.34);
  if (runSpeed) setThreshold(db, "run", "threshold_pace", runSpeed, today);

  const swimSpeed = paceToSpeed(String(formData.get("swimPace") ?? ""), 100);
  if (swimSpeed) setThreshold(db, "swim", "threshold_pace", swimSpeed, today);

  const thr = num("thresholdHr");
  const max = num("maxHr");
  const rest = num("restingHr");
  for (const curve of ["run", "bike", "swim"] as const) {
    if (thr) setThreshold(db, curve, "threshold_hr", thr, today);
  }
  if (max) setThreshold(db, "run", "max_hr", max, today);
  if (rest) setThreshold(db, "run", "resting_hr", rest, today);

  // Re-derive metrics for existing activities so the change takes effect.
  reprocessAll(db);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

interface ZoneBlock {
  metric: "power" | "hr" | "pace";
  curve: string;
  thresholds: Record<string, number | string | "">;
  zones: { name: string; low: number | string | ""; high: number | string | "" }[];
}

/** Persist zones + benchmarks edited in the Zones settings, then reprocess. */
export async function saveZones(payload: string): Promise<void> {
  const db = getDb();
  const today = todayLocal(getAthlete(db)?.timezone ?? "America/New_York");
  const setT = (
    curve: Parameters<typeof setThreshold>[1],
    metric: Parameters<typeof setThreshold>[2],
    v: unknown,
  ) => {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) setThreshold(db, curve, metric, n, today);
  };

  let blocks: ZoneBlock[] = [];
  try {
    blocks = JSON.parse(payload) as ZoneBlock[];
  } catch {
    return;
  }

  for (const b of blocks) {
    const th = b.thresholds ?? {};
    if (b.metric === "power") setT("bike", "ftp", th.ftp);
    if (b.metric === "hr") {
      for (const c of ["run", "bike", "swim"] as const)
        setT(c, "threshold_hr", th.thr);
      setT("run", "max_hr", th.max);
      setT("run", "resting_hr", th.rest);
    }
    replaceZones(
      db,
      b.curve,
      b.metric,
      (b.zones ?? []).map((z) => ({
        name: String(z.name),
        low: Number(z.low) || 0,
        high: Number(z.high) || 0,
      })),
      today,
    );
  }

  reprocessAll(db);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

/**
 * Persist a settings sub-section's preferences. The form includes a hidden
 * `_section` and `_fields` (comma-separated field names) so unchecked
 * checkboxes are stored as "0" rather than silently dropped.
 */
export async function saveSettings(formData: FormData): Promise<void> {
  const db = getDb();
  const section = String(formData.get("_section") ?? "").trim();
  const fields = String(formData.get("_fields") ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  if (!section) return;
  for (const f of fields) {
    const raw = formData.get(f);
    const value = raw == null ? "0" : raw === "on" ? "1" : String(raw);
    setSetting(db, `${section}.${f}`, value);
  }
  revalidatePath("/settings");
}
