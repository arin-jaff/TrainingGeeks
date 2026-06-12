import { getDb } from "@/lib/db/client";
import { getAthlete } from "@/lib/db/repo";
import { isReadOnly } from "@/lib/auth/config";
import { assembleFeed } from "@/lib/federation/feedServer";
import type { Units } from "@/lib/db/types";
import SocialHub from "@/components/social/SocialHub";

export const dynamic = "force-dynamic";

// The Social hub: an opt-in, sectioned-off space for friends and shared data.
// It never touches the personal experience — if you never open it (or never set
// TG_DIRECTORY_URL), nothing here affects Home/Calendar/Dashboard. The feed is
// assembled server-side (plain reads), so it renders on the read-only demo too;
// kudos and comments are disabled there.
export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const db = getDb();
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const { days } = await searchParams;
  const window = Number(days) || 30;
  const feed = await assembleFeed(db, { days: window });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink">Social</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Check out your friends&apos; training!
        </p>
      </div>
      <SocialHub feed={feed} units={units} readOnly={isReadOnly()} days={window} />
    </div>
  );
}
