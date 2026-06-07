import { getDb } from "@/lib/db/client";
import { getSettingsData } from "@/lib/queries/settings";
import SettingsModal from "@/components/settings/SettingsModal";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const d = getSettingsData(getDb());
  return (
    <SettingsModal
      initialSection={section ?? "profile"}
      athlete={d.athlete}
      settings={{
        ftp: d.ftp,
        thresholdHr: d.thresholdHr,
        maxHr: d.maxHr,
        restingHr: d.restingHr,
        connector: d.connector,
        hrZones: d.hrZones,
        powerZones: d.powerZones,
        paceZones: d.paceZones,
      }}
    />
  );
}
