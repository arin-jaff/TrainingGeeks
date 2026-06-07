import { getDb } from "@/lib/db/client";
import { getSettingsData } from "@/lib/queries/settings";
import {
  saveConnector,
  saveThresholds,
  updateProfile,
} from "@/app/actions/settings";
import { hrZones, paceZones, powerZones, type Zone } from "@/lib/zones";
import { formatPace } from "@/lib/util/format";
import type { Units } from "@/lib/db/types";
import SyncButton from "@/components/settings/SyncButton";
import HistorySync from "@/components/settings/HistorySync";

export const dynamic = "force-dynamic";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "UTC",
];

function paceString(speed: number | null, perMeters: number): string {
  if (!speed || speed <= 0) return "";
  const secs = perMeters / speed;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const input =
  "w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent";
const label = "mb-1 block text-sm font-medium text-ink";

function ZonesTable({
  title,
  zones,
  format,
}: {
  title: string;
  zones: Zone[];
  format: (v: number) => string;
}) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h4>
      <ul className="divide-y divide-line rounded border border-line text-sm">
        {zones.map((z) => (
          <li key={z.name} className="flex justify-between px-3 py-1.5">
            <span className="text-ink">{z.name}</span>
            <span className="tabular-nums text-ink-muted">
              {format(z.low)} – {z.high == null ? "∞" : format(z.high)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SettingsPage() {
  const db = getDb();
  const d = getSettingsData(db);
  const a = d.athlete;
  const units: Units = a?.units ?? "imperial";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold text-ink">Settings</h1>

      {/* Profile */}
      <section className="rounded border border-line bg-surface-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">Profile</h2>
        <form action={updateProfile} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Name</label>
            <input name="name" defaultValue={a?.name ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input name="email" defaultValue={a?.email ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Units</label>
            <select name="units" defaultValue={units} className={input}>
              <option value="imperial">Imperial (mi)</option>
              <option value="metric">Metric (km)</option>
            </select>
          </div>
          <div>
            <label className={label}>Time Zone</label>
            <select
              name="timezone"
              defaultValue={a?.timezone ?? "America/New_York"}
              className={input}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Default strength RPE (1–10)</label>
            <input
              name="rpe"
              type="number"
              min={1}
              max={10}
              defaultValue={a?.strength_rpe_default ?? 5}
              className={input}
            />
          </div>
          <div className="sm:col-span-2">
            <button className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover">
              Save Profile
            </button>
          </div>
        </form>
      </section>

      {/* Thresholds & Zones */}
      <section className="rounded border border-line bg-surface-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-ink">Thresholds &amp; Zones</h2>
        <p className="mb-3 text-xs text-ink-muted">
          Saving recomputes metrics for existing activities. Zones are
          auto-calculated from your thresholds.
        </p>
        <form action={saveThresholds} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={label}>Bike FTP (W)</label>
            <input name="ftp" type="number" defaultValue={d.ftp ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Run threshold (min/mi)</label>
            <input
              name="runPace"
              placeholder="6:21"
              defaultValue={paceString(d.runPaceSpeed, 1609.34)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Swim threshold (min/100m)</label>
            <input
              name="swimPace"
              placeholder="1:45"
              defaultValue={paceString(d.swimPaceSpeed, 100)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Threshold HR</label>
            <input name="thresholdHr" type="number" defaultValue={d.thresholdHr ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Max HR</label>
            <input name="maxHr" type="number" defaultValue={d.maxHr ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Resting HR</label>
            <input name="restingHr" type="number" defaultValue={d.restingHr ?? ""} className={input} />
          </div>
          <div className="sm:col-span-3">
            <button className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover">
              Save &amp; Recompute
            </button>
          </div>
        </form>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {d.ftp && (
            <ZonesTable title="Power (W)" zones={powerZones(d.ftp)} format={(v) => String(v)} />
          )}
          {d.thresholdHr && (
            <ZonesTable title="Heart Rate (bpm)" zones={hrZones(d.thresholdHr)} format={(v) => String(v)} />
          )}
          {d.runPaceSpeed && (
            <ZonesTable
              title="Run Pace"
              zones={paceZones(d.runPaceSpeed)}
              format={(v) => (v > 0 ? formatPace(v, units, "run") : "—")}
            />
          )}
        </div>
      </section>

      {/* Connections */}
      <section className="rounded border border-line bg-surface-card p-4">
        <h2 className="text-sm font-semibold text-ink">intervals.icu</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Auto-import activities and planned workouts. Get your API key and
          athlete id from intervals.icu → Settings → Developer Settings.
        </p>
        <form action={saveConnector} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Athlete ID</label>
            <input name="athleteId" defaultValue={d.connector?.athlete_id ?? ""} placeholder="i123456" className={input} />
          </div>
          <div>
            <label className={label}>
              API Key {d.connector?.api_key && <span className="text-ink-muted">(saved)</span>}
            </label>
            <input name="apiKey" type="password" placeholder={d.connector?.api_key ? "••••••••" : "your API key"} className={input} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
            <input type="checkbox" name="enabled" defaultChecked={d.connector?.enabled === 1} className="accent-accent" />
            Enable automatic sync
          </label>
          <div className="sm:col-span-2">
            <button className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover">
              Save
            </button>
          </div>
        </form>
        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-2 text-sm text-ink-muted">
            Status: <span className="text-ink">{d.connector?.enabled ? "enabled" : "disabled"}</span>
            {d.connector?.last_sync_cursor && <> · last sync through {d.connector.last_sync_cursor}</>}
          </div>
          <SyncButton />
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <HistorySync />
        </div>
      </section>
    </div>
  );
}
