import type { DB } from "./client.js";
import type { FitnessCurve, ThresholdMetric } from "./types.js";
import { upsertConnector } from "./repo.js";

const EPOCH = "2000-01-01"; // valid_from for seed thresholds (applies to all history)

/**
 * Seed the single athlete and placeholder thresholds. Idempotent — only
 * inserts what is missing, so it is safe to run on every startup.
 *
 * Pace thresholds are stored internally as threshold SPEED in m/s; the UI
 * converts to min/mi or /100m for display. Edit these in Settings (M12).
 */
export function seed(db: DB): void {
  const hasAthlete = db.prepare("SELECT 1 FROM athlete WHERE id = 1").get();
  if (!hasAthlete) {
    db.prepare(
      `INSERT INTO athlete (id, name, email, units, timezone)
       VALUES (1, ?, ?, 'imperial', 'America/New_York')`,
    ).run("Arin Jaff", "arin@phia.com");
  }

  const defaults: Array<[FitnessCurve, ThresholdMetric, number]> = [
    ["run", "threshold_pace", 1609.34 / 381], // 6:21 min/mi -> m/s
    ["run", "threshold_hr", 180],
    ["run", "max_hr", 200],
    ["run", "resting_hr", 40],
    ["bike", "ftp", 250], // watts (placeholder)
    ["bike", "threshold_hr", 180],
    ["swim", "threshold_pace", 100 / 105], // 1:45 /100m -> m/s
  ];

  const exists = db.prepare(
    "SELECT 1 FROM threshold WHERE curve = ? AND metric = ?",
  );
  const insert = db.prepare(
    "INSERT INTO threshold (curve, metric, value, valid_from) VALUES (?, ?, ?, ?)",
  );
  for (const [curve, metric, value] of defaults) {
    if (!exists.get(curve, metric)) insert.run(curve, metric, value, EPOCH);
  }

  // Auto-configure the intervals.icu connector from environment, so it
  // persists across DB resets without re-entering it in the UI.
  const athleteId = process.env.TG_INTERVALS_ATHLETE_ID;
  const apiKey = process.env.TG_INTERVALS_API_KEY;
  if (athleteId && apiKey) {
    upsertConnector(db, "intervals", {
      athlete_id: athleteId,
      api_key: apiKey,
      enabled: 1,
    });
  }
}
