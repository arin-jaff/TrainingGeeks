import { getDb } from "@/lib/db/client";
import { getAthlete } from "@/lib/db/repo";
import type { Units } from "@/lib/db/types";
import FederationPanel from "@/components/settings/FederationPanel";

export const dynamic = "force-dynamic";

// The Social hub: an opt-in, sectioned-off space for friends and shared data.
// It never touches the personal experience — if you never open it (or never set
// TG_DIRECTORY_URL), nothing here affects Home/Calendar/Dashboard.
export default function SocialPage() {
  const units: Units = getAthlete(getDb())?.units ?? "imperial";
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink">Social</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Connect with friends on their own self-hosted instances and share the
          training data you choose. Your data stays on your machine.
        </p>
      </div>
      <FederationPanel units={units} />
    </div>
  );
}
