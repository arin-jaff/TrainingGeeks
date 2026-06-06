import type { DB } from "../db/client.js";
import { listPaceEfforts, type PaceEffortRow } from "../db/repo.js";

export interface PeaksData {
  efforts: PaceEffortRow[]; // { window, speed, activity_id, date, modality }
}

export function getPeaksData(db: DB): PeaksData {
  return { efforts: listPaceEfforts(db) };
}
