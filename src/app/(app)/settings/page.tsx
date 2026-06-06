import { getDb } from "@/lib/db/client";
import { getConnector } from "@/lib/db/repo";
import { saveConnector } from "@/app/actions/settings";
import SyncButton from "@/components/settings/SyncButton";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const db = getDb();
  const conn = getConnector(db, "intervals");
  const hasKey = !!conn?.api_key;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-lg font-semibold text-ink">Settings</h1>

      <section className="rounded border border-line bg-surface-card p-4">
        <h2 className="text-sm font-semibold text-ink">intervals.icu</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Auto-import activities and planned workouts. Find your API key and
          athlete id under intervals.icu → Settings → Developer Settings.
        </p>

        <form action={saveConnector} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Athlete ID
            </label>
            <input
              name="athleteId"
              defaultValue={conn?.athlete_id ?? ""}
              placeholder="i123456"
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              API Key {hasKey && <span className="text-ink-muted">(saved — leave blank to keep)</span>}
            </label>
            <input
              name="apiKey"
              type="password"
              placeholder={hasKey ? "••••••••" : "your API key"}
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={conn?.enabled === 1}
              className="accent-accent"
            />
            Enable automatic sync
          </label>
          <button className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover">
            Save
          </button>
        </form>

        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-2 text-sm text-ink-muted">
            Status:{" "}
            <span className="text-ink">
              {conn?.enabled ? "enabled" : "disabled"}
            </span>
            {conn?.last_sync_cursor && (
              <> · last sync through {conn.last_sync_cursor}</>
            )}
          </div>
          <SyncButton />
        </div>
      </section>
    </div>
  );
}
