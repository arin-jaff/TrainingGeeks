// Backfill per-set strength data for existing strength activities by re-reading
// their stored raw FITs. Run once after upgrading: `node --import tsx scripts/backfill-strength.mjs`
import { getDb } from "../src/lib/db/client.ts";
import { backfillStrengthSets } from "../src/lib/strength/backfill.ts";

const r = backfillStrengthSets(getDb());
console.log(`Backfilled ${r.sets} sets across ${r.processed} strength activities.`);
