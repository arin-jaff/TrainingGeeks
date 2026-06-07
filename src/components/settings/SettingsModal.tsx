"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AthleteRow, ConnectorAccountRow } from "@/lib/db/types";
import { updateProfile, saveConnector } from "@/app/actions/settings";
import {
  HR_METHODS,
  HR_TYPES,
  PACE_METHODS,
  PACE_TYPES,
  POWER_METHODS,
  POWER_TYPES,
  DEFAULT_HR_ZONES,
  DEFAULT_POWER_ZONES,
  DEFAULT_PACE_ZONES,
} from "@/lib/zones/methods";
import ZoneEditor from "./ZoneEditor";
import SyncButton from "./SyncButton";
import HistorySync from "./HistorySync";

interface SettingsData {
  ftp: number | null;
  thresholdHr: number | null;
  maxHr: number | null;
  restingHr: number | null;
  connector: ConnectorAccountRow | undefined;
}

type Section = string;

const ACCOUNT_NAV: [Section, string][] = [
  ["profile", "Profile"],
  ["subscription", "Subscription & Payments"],
  ["settings", "Settings"],
  ["coaches", "Coaches"],
  ["calendar", "Calendar"],
  ["email", "Email Options"],
  ["apps", "Apps & Devices"],
  ["notifications", "Notifications"],
  ["export", "Export Data"],
];
const LOWER_NAV: [Section, string][] = [
  ["zones", "Zones"],
  ["nutrition", "Nutrition"],
  ["equipment", "Equipment"],
  ["layout", "Layout"],
  ["weather", "Weather"],
];

const input =
  "w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent";
const label = "text-sm text-ink";

function Field({ label: l, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
      <span className={label}>{l}</span>
      {children}
    </div>
  );
}

function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h2 className="border-b border-line pb-1 text-lg text-ink">{title}</h2>
      <p className="mt-3 text-sm text-ink-muted">{note}</p>
    </div>
  );
}

export default function SettingsModal({
  athlete,
  settings,
  initialSection = "profile",
}: {
  athlete: AthleteRow | undefined;
  settings: SettingsData;
  initialSection?: string;
}) {
  const router = useRouter();
  const [section, setSection] = useState<Section>(initialSection);

  const NavItem = ({ id, label: l, indent }: { id: Section; label: string; indent?: boolean }) => (
    <button
      onClick={() => setSection(id)}
      className={[
        "block w-full px-3 py-1.5 text-left text-sm",
        indent ? "" : "font-medium",
        section === id ? "bg-surface font-semibold text-ink" : "text-ink-muted hover:text-ink",
      ].join(" ")}
    >
      {l}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg bg-surface-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h1 className="text-lg text-ink">Account Settings</h1>
          <button
            onClick={() => router.push("/")}
            className="text-xl leading-none text-ink-muted hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Section nav */}
          <nav className="w-52 shrink-0 overflow-y-auto border-r border-line py-3">
            <div className="px-3 pb-1 text-sm font-bold text-ink">Account</div>
            {ACCOUNT_NAV.map(([id, l]) => (
              <NavItem key={id} id={id} label={l} indent />
            ))}
            <div className="mt-3 border-t border-line pt-2">
              {LOWER_NAV.map(([id, l]) => (
                <NavItem key={id} id={id} label={l} indent />
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="min-w-0 flex-1 overflow-y-auto p-6">
            {section === "profile" && (
              <form action={updateProfile} className="max-w-2xl">
                <h2 className="border-b border-line pb-1 text-lg text-ink">Profile</h2>
                <p className="mb-4 mt-3 text-sm font-bold text-ink">
                  Personal Information
                </p>
                <div className="space-y-3">
                  <Field label="First and Last Name">
                    <input name="name" defaultValue={athlete?.name ?? ""} className={input} />
                  </Field>
                  <Field label="Email Address">
                    <input name="email" defaultValue={athlete?.email ?? ""} className={input} />
                  </Field>
                  <Field label="Athlete Type">
                    <div className="flex gap-2">
                      <select className={input} defaultValue="Other">
                        <option>Other</option><option>Runner</option><option>Cyclist</option><option>Triathlete</option><option>Swimmer</option>
                      </select>
                      <select className={input} defaultValue="Male">
                        <option>Male</option><option>Female</option>
                      </select>
                    </div>
                  </Field>
                  <Field label="Units">
                    <select name="units" defaultValue={athlete?.units ?? "imperial"} className={input}>
                      <option value="imperial">English (mi, ft, lb)</option>
                      <option value="metric">Metric (km, m, kg)</option>
                    </select>
                  </Field>
                  <Field label="Time Zone">
                    <select name="timezone" defaultValue={athlete?.timezone ?? "America/New_York"} className={input}>
                      {["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","Europe/London","UTC"].map((tz)=>(<option key={tz} value={tz}>{tz}</option>))}
                    </select>
                  </Field>
                  <Field label="Default RPE">
                    <input name="rpe" type="number" min={1} max={10} defaultValue={athlete?.strength_rpe_default ?? 5} className={`${input} w-24`} />
                  </Field>
                  <Field label="Date of Birth">
                    <input defaultValue={athlete?.dob ?? ""} placeholder="YYYY-MM-DD" className={`${input} w-40`} />
                  </Field>
                </div>
                <div className="mt-5">
                  <button className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover">
                    Save Profile
                  </button>
                </div>
              </form>
            )}

            {section === "zones" && (
              <div className="max-w-3xl">
                <ZoneEditor
                  title="Speed / Pace"
                  defaultLabel="Default Speed/Pace"
                  thresholds={[{ key: "pace", label: "Threshold", value: "", unit: "min/mi" }]}
                  types={PACE_TYPES}
                  methodsByType={PACE_METHODS}
                  initialZones={DEFAULT_PACE_ZONES}
                />
                <ZoneEditor
                  title="Heart Rate"
                  defaultLabel="Default Heart Rate"
                  thresholds={[
                    { key: "thr", label: "Threshold Heart Rate", value: settings.thresholdHr ?? "", unit: "bpm" },
                    { key: "max", label: "Max Heart Rate", value: settings.maxHr ?? "", unit: "bpm" },
                    { key: "rest", label: "Resting Heart Rate", value: settings.restingHr ?? "", unit: "bpm" },
                  ]}
                  types={HR_TYPES}
                  methodsByType={HR_METHODS}
                  initialZones={DEFAULT_HR_ZONES}
                  showAddActivity
                />
                <ZoneEditor
                  title="Power"
                  defaultLabel="Default Power"
                  thresholds={[{ key: "ftp", label: "Threshold Power", value: settings.ftp ?? "", unit: "W" }]}
                  types={POWER_TYPES}
                  methodsByType={POWER_METHODS}
                  initialZones={DEFAULT_POWER_ZONES}
                />
              </div>
            )}

            {section === "apps" && (
              <div className="max-w-2xl">
                <h2 className="border-b border-line pb-1 text-lg text-ink">Apps &amp; Devices</h2>
                <h3 className="mt-4 text-sm font-bold text-ink">intervals.icu</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Auto-import activities and planned workouts.
                </p>
                <form action={saveConnector} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm">Athlete ID</label>
                    <input name="athleteId" defaultValue={settings.connector?.athlete_id ?? ""} className={input} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">API Key {settings.connector?.api_key && <span className="text-ink-muted">(saved)</span>}</label>
                    <input name="apiKey" type="password" placeholder={settings.connector?.api_key ? "••••••••" : ""} className={input} />
                  </div>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" name="enabled" defaultChecked={settings.connector?.enabled === 1} className="accent-accent" />
                    Enable automatic sync
                  </label>
                  <div className="sm:col-span-2">
                    <button className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover">Save</button>
                  </div>
                </form>
                <div className="mt-4 space-y-4 border-t border-line pt-4">
                  <SyncButton />
                  <HistorySync />
                </div>
              </div>
            )}

            {section === "subscription" && <Placeholder title="Subscription & Payments" note="Premium plan management. Not applicable to a self-hosted install." />}
            {section === "settings" && <Placeholder title="Settings" note="General preferences (date format, week start, default views)." />}
            {section === "coaches" && <Placeholder title="Coaches" note="Connect a coach to share your calendar. Coach view is a future feature." />}
            {section === "calendar" && <Placeholder title="Calendar" note="Calendar display options (week start day, completed/planned visibility)." />}
            {section === "email" && <Placeholder title="Email Options" note="Email summary and reminder preferences." />}
            {section === "notifications" && <Placeholder title="Notifications" note="Push and in-app notification preferences." />}
            {section === "export" && <Placeholder title="Export Data" note="Download your activities and metrics. FIT files are stored locally under data/fit." />}
            {section === "nutrition" && <Placeholder title="Nutrition" note="Daily nutrition targets and logging." />}
            {section === "equipment" && <Placeholder title="Equipment" note="Bikes, shoes and gear with mileage tracking." />}
            {section === "layout" && <Placeholder title="Layout" note="Default dashboard and calendar layout preferences." />}
            {section === "weather" && <Placeholder title="Weather" note="Show weather on the calendar (requires a weather provider)." />}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-5 border-t border-line px-5 py-3">
          <button onClick={() => router.push("/")} className="text-sm font-medium text-accent">
            Cancel
          </button>
          <button onClick={() => router.refresh()} className="text-sm font-medium text-accent">
            Save
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
