#!/usr/bin/env node
/**
 * One-time fix: earlier builds had no "row" modality, so rowing FIT files
 * (sport "rowing" / subSport "indoorRowing") were misclassified as strength.
 * This reclassifies them to "row", fixes their auto-name, and reprocesses
 * metrics + fitness so rowing contributes to the Fitness score.
 *
 *   node --import tsx scripts/reclassify-rowing.mjs
 */
import { getDb } from "../src/lib/db/client.ts";
import { reprocessAll } from "../src/lib/import/reprocess.ts";

const db = getDb();
const where =
  "modality IN ('lift','core') AND lower(coalesce(sport_detail,'')) LIKE '%row%'";

const n = db.prepare(`SELECT COUNT(*) AS c FROM activity WHERE ${where}`).get().c;
db.prepare(
  `UPDATE activity
      SET modality = 'row',
          name = CASE WHEN name = 'Strength' OR name IS NULL THEN 'Rowing' ELSE name END
    WHERE ${where}`,
).run();

const done = reprocessAll(db);
console.log(`Reclassified ${n} rowing activities; reprocessed ${done}; fitness rebuilt.`);
