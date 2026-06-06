import type { DB } from "../db/client.js";
import {
  getAthlete,
  getConnector,
  getEffectiveThreshold,
} from "../db/repo.js";
import type { AthleteRow, ConnectorAccountRow } from "../db/types.js";
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
  };
}
