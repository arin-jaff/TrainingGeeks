import { getDb } from "@/lib/db/client";
import { getAthlete } from "@/lib/db/repo";
import { getPeaksData } from "@/lib/queries/peaks";
import type { Units } from "@/lib/db/types";
import PeaksExplorer from "@/components/peaks/PeaksExplorer";

export const dynamic = "force-dynamic";

export default function PeaksPage() {
  const db = getDb();
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const { efforts } = getPeaksData(db);

  return (
    <div className="mx-auto max-w-3xl">
      <PeaksExplorer efforts={efforts} units={units} />
    </div>
  );
}
