import { HR_METHOD_DATA, POWER_METHOD_DATA } from "./data.js";
import type { ZoneRow } from "./methods.js";

export type ZoneMetric = "power" | "hr" | "pace";

/**
 * Compute contiguous integer zone ranges for a method from a single anchor
 * value (FTP/CP for power; LTHR or MaxHR for heart rate). Each zone's upper
 * bound = round(highPct × anchor); the next zone starts at +1. The open-ended
 * top zone is capped.
 */
export function calculateZones(
  metric: ZoneMetric,
  methodId: string,
  anchor: number,
): ZoneRow[] | null {
  const data =
    metric === "power"
      ? POWER_METHOD_DATA
      : metric === "hr"
        ? HR_METHOD_DATA
        : null;
  if (!data) return null;
  const def = data[methodId];
  if (!def || !Number.isFinite(anchor) || anchor <= 0) return null;

  const cap = metric === "power" ? Math.max(2000, Math.round(anchor * 2.5)) : 255;
  let prev = -1;
  return def.zones.map((z, i) => {
    const high = z.high == null ? cap : Math.round(z.high * anchor);
    const low = i === 0 ? 0 : prev + 1;
    prev = high;
    const name =
      metric === "power"
        ? String(i + 1)
        : z.name
          ? `Zone ${i + 1}: ${z.name}`
          : `Zone ${i + 1}`;
    return { name, low, high };
  });
}

export function hasMethodData(metric: ZoneMetric, methodId: string): boolean {
  if (!methodId) return false;
  const data = metric === "power" ? POWER_METHOD_DATA : metric === "hr" ? HR_METHOD_DATA : null;
  return !!data && !!data[methodId];
}
