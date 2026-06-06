import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { openDb } from "../db/client.js";
import { seed } from "../db/seed.js";
import { getActivity, getEffectiveThreshold, setThreshold } from "../db/repo.js";
import { importFitBuffer } from "./service.js";
import { reprocessAll } from "./reprocess.js";

const FIT_DIR = join(process.cwd(), "references", ".fit-files");
function sample(prefix: string): Buffer | null {
  if (!existsSync(FIT_DIR)) return null;
  const f = readdirSync(FIT_DIR).find((n) => n.toUpperCase().startsWith(prefix));
  return f ? readFileSync(join(FIT_DIR, f)) : null;
}

test("editing the threshold and reprocessing changes TSS", (t) => {
  const run = sample("RUN");
  if (!run) return t.skip("no RUN sample");
  const db = openDb(":memory:");
  seed(db);

  const r = importFitBuffer(db, run, "manual", { storeRaw: false });
  const tssBefore = getActivity(db, r.activityId)!.tss!;
  assert.ok(tssBefore > 0);

  // Raise the run threshold speed (faster threshold => lower IF => lower TSS).
  const cur = getEffectiveThreshold(db, "run", "threshold_pace", "2000-01-02")!;
  setThreshold(db, "run", "threshold_pace", cur * 1.25, "2000-01-01");

  const n = reprocessAll(db);
  assert.equal(n, 1);
  const tssAfter = getActivity(db, r.activityId)!.tss!;
  assert.ok(tssAfter < tssBefore, `expected ${tssAfter} < ${tssBefore}`);
});
