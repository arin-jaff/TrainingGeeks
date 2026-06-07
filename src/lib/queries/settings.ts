import type { DB } from "../db/client.js";
import {
  getAllSettings,
  getAthlete,
  getConnector,
  getEffectiveThreshold,
  listEquipment,
  listZonesFor,
  type EquipmentRow,
} from "../db/repo.js";
import type { AthleteRow, ConnectorAccountRow } from "../db/types.js";
import type { ZoneRow as MethodZoneRow } from "../zones/methods.js";
import { todayLocal } from "../util/dates.js";

export interface SettingsData {
  athlete: AthleteRow | undefined;
  ftp: number | null;
  runPaceSpeed: number | null;
  swimPaceSpeed: number | null;
  thresholdHr: number | null;
  maxHr: number | null;
  restingHr: number | null;
  connector: ConnectorAccountRow | undefined;
  hrZones: MethodZoneRow[];
  powerZones: MethodZoneRow[];
  paceZones: MethodZoneRow[];
  prefs: Record<string, string>;
  equipment: EquipmentRow[];
}

function savedZones(
  db: DB,
  curve: string,
  metric: string,
): MethodZoneRow[] {
  return listZonesFor(db, curve, metric).map((z) => ({
    name: z.name,
    low: z.low,
    high: z.high,
  }));
}

export function getSettingsData(db: DB): SettingsData {
  const athlete = getAthlete(db);
  const tz = athlete?.timezone ?? "America/New_York";
  const today = todayLocal(tz);
  const t = (curve: "run" | "bike" | "swim", metric: Parameters<typeof getEffectiveThreshold>[2]) =>
    getEffectiveThreshold(db, curve, metric, today) ?? null;

  return {
    athlete,
    ftp: t("bike", "ftp"),
    runPaceSpeed: t("run", "threshold_pace"),
    swimPaceSpeed: t("swim", "threshold_pace"),
    thresholdHr: t("run", "threshold_hr"),
    maxHr: t("run", "max_hr"),
    restingHr: t("run", "resting_hr"),
    connector: getConnector(db, "intervals"),
    hrZones: savedZones(db, "run", "hr"),
    powerZones: savedZones(db, "bike", "power"),
    paceZones: savedZones(db, "run", "pace"),
    prefs: getAllSettings(db),
    equipment: listEquipment(db),
  };
}
