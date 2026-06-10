"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AthleteRow } from "@/lib/db/types";
import type { ConnectorSummary } from "@/lib/queries/settings";
import { updateProfile, saveConnector, saveZones } from "@/app/actions/settings";
import type { ZoneRow } from "@/lib/zones/methods";
import type { ZoneSnapshot } from "./ZoneEditor";
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
import PrefsForm from "./PrefsForm";
import ExportData from "./ExportData";
import EquipmentManager from "./EquipmentManager";
import type { EquipmentRow } from "@/lib/db/repo";

interface SettingsData {
  ftp: number | null;
  thresholdHr: number | null;
  maxHr: number | null;
  restingHr: number | null;
  connector: ConnectorSummary | undefined;
  hrZones: ZoneRow[];
  powerZones: ZoneRow[];
  paceZones: ZoneRow[];
  prefs: Record<string, string>;
  equipment: EquipmentRow[];
}

type Section = string;

const ACCOUNT_NAV: [Section, string][] = [
  ["profile", "Profile"],
  ["subscription", "Subscription & Payments"],
  ["settings", "Settings"],
  ["calendar", "Calendar"],
  ["email", "Email Options"],
  ["apps", "Apps & Devices"],
  ["notifications", "Notifications"],
  ["export", "Export Data"],
];
const LOWER_NAV: [Section, string][] = [
  ["zones", "Zones"],
  ["strength", "Strength"],
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 border-b border-line pb-1 text-lg text-ink">{children}</h2>
  );
}

const sel = input;

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
  const prefs = settings.prefs ?? {};
  const [section, setSection] = useState<Section>(initialSection);
  const [, startTransition] = useTransition();
  const snaps = useRef<Record<string, ZoneSnapshot>>({});
  const onSnapshot = (s: ZoneSnapshot) => {
    snaps.current[s.metric] = s;
  };
  const persistZones = (then?: () => void) =>
    startTransition(async () => {
      await saveZones(JSON.stringify(Object.values(snaps.current)));
      router.refresh();
      then?.();
    });

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
                <div className="mt-4 flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/avatar.png"
                    alt=""
                    className="h-16 w-16 rounded-full border border-line object-cover"
                  />
                  <div>
                    <div className="text-sm font-medium text-ink">{athlete?.name ?? "Athlete"}</div>
                    <div className="mt-1 text-xs text-ink-muted">Set your name and email below.</div>
                  </div>
                </div>
                <p className="mb-4 mt-4 text-sm font-bold text-ink">
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
                    <input name="dob" defaultValue={athlete?.dob ?? ""} placeholder="YYYY-MM-DD" className={`${input} w-40`} />
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
                  metric="pace"
                  curve="run"
                  onSnapshot={onSnapshot}
                  title="Speed / Pace"
                  defaultLabel="Default Speed/Pace"
                  thresholds={[{ key: "pace", label: "Threshold", value: "", unit: "min/mi" }]}
                  types={PACE_TYPES}
                  methodsByType={PACE_METHODS}
                  initialZones={settings.paceZones.length ? settings.paceZones : DEFAULT_PACE_ZONES}
                />
                <ZoneEditor
                  metric="hr"
                  curve="run"
                  onSnapshot={onSnapshot}
                  title="Heart Rate"
                  defaultLabel="Default Heart Rate"
                  thresholds={[
                    { key: "thr", label: "Threshold Heart Rate", value: settings.thresholdHr ?? "", unit: "bpm" },
                    { key: "max", label: "Max Heart Rate", value: settings.maxHr ?? "", unit: "bpm" },
                    { key: "rest", label: "Resting Heart Rate", value: settings.restingHr ?? "", unit: "bpm" },
                  ]}
                  types={HR_TYPES}
                  methodsByType={HR_METHODS}
                  initialZones={settings.hrZones.length ? settings.hrZones : DEFAULT_HR_ZONES}
                  showAddActivity
                />
                <ZoneEditor
                  metric="power"
                  curve="bike"
                  onSnapshot={onSnapshot}
                  title="Power"
                  defaultLabel="Default Power"
                  thresholds={[{ key: "ftp", label: "Threshold Power", value: settings.ftp ?? "", unit: "W" }]}
                  types={POWER_TYPES}
                  methodsByType={POWER_METHODS}
                  initialZones={settings.powerZones.length ? settings.powerZones : DEFAULT_POWER_ZONES}
                />
              </div>
            )}

            {section === "apps" && (
              <div className="max-w-2xl">
                <h2 className="border-b border-line pb-1 text-lg text-ink">Apps &amp; Devices</h2>
                <div className="mt-4 rounded border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/intervals-wordmark.png" alt="intervals.icu" className="h-7 w-auto" />
                    <a
                      href="https://intervals.icu"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Visit intervals.icu →
                    </a>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    Connect your free{" "}
                    <a href="https://intervals.icu" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      intervals.icu
                    </a>{" "}
                    account to auto-import activities and planned workouts. Find
                    your Athlete ID and API key under{" "}
                    <a
                      href="https://intervals.icu/settings"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      Settings → Developer
                    </a>
                    .
                  </p>
                </div>
                <form action={saveConnector} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm">Athlete ID</label>
                    <input name="athleteId" defaultValue={settings.connector?.athlete_id ?? ""} className={input} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">API Key {settings.connector?.hasApiKey && <span className="text-ink-muted">(saved)</span>}</label>
                    <input name="apiKey" type="password" placeholder={settings.connector?.hasApiKey ? "••••••••" : ""} className={input} />
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

            {section === "subscription" && (
              <div className="max-w-2xl">
                <SectionTitle>Subscription &amp; Payments</SectionTitle>
                <div className="rounded border border-line p-4">
                  <p className="text-sm font-semibold text-ink">TrainingGeeks · Self-hosted</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Premium plan — all features unlocked. No billing on a
                    self-hosted install.
                  </p>
                </div>
              </div>
            )}

            {section === "settings" && (
              <PrefsForm
                title="Settings"
                section="settings"
                prefs={prefs}
                fields={[
                  { name: "dateFormat", label: "Date Format", type: "select", options: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] },
                  { name: "weekStart", label: "First Day of Week", type: "select", options: ["Monday", "Sunday"] },
                  { name: "timeFormat", label: "Time Format", type: "select", options: ["12-hour", "24-hour"] },
                  { name: "defaultView", label: "Default View", type: "select", options: ["Calendar", "Home", "Dashboard"] },
                  { name: "autoRecalc", label: "Recalculate zones on threshold change", type: "toggle", default: "1" },
                ]}
              />
            )}

            {section === "strength" && (
              <PrefsForm
                title="Strength"
                section="strength"
                prefs={prefs}
                fields={[
                  {
                    name: "formula",
                    label: "Estimated 1RM formula",
                    type: "select",
                    options: ["Brzycki", "Epley"],
                    default: "Brzycki",
                  },
                ]}
              />
            )}

            {section === "coaches" && (
              <div className="max-w-2xl">
                <SectionTitle>Coaches</SectionTitle>
                <p className="text-sm text-ink-muted">You have no coaches connected.</p>
                <div className="mt-3 flex items-center gap-2">
                  <input placeholder="Coach email" className={`${sel} max-w-xs`} />
                  <button className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover">Add Coach</button>
                </div>
              </div>
            )}

            {section === "calendar" && (
              <PrefsForm
                title="Calendar"
                section="calendar"
                prefs={prefs}
                fields={[
                  { name: "weekStart", label: "First Day of Week", type: "select", options: ["Monday", "Sunday"] },
                  { name: "showCompleted", label: "Show completed workouts", type: "toggle", default: "1" },
                  { name: "showPlanned", label: "Show planned workouts", type: "toggle", default: "1" },
                  { name: "showSummary", label: "Show weekly summary column", type: "toggle", default: "1" },
                  { name: "showWeather", label: "Show weather", type: "toggle", default: "0" },
                ]}
              />
            )}

            {section === "email" && (
              <PrefsForm
                title="Email Options"
                section="email"
                prefs={prefs}
                fields={[
                  { name: "weeklySummary", label: "Weekly training summary", type: "toggle", default: "1" },
                  { name: "reminders", label: "Workout reminders", type: "toggle", default: "0" },
                  { name: "countdowns", label: "Goal & event countdowns", type: "toggle", default: "1" },
                  { name: "news", label: "Product news & tips", type: "toggle", default: "0" },
                ]}
              />
            )}

            {section === "notifications" && (
              <PrefsForm
                title="Notifications"
                section="notifications"
                prefs={prefs}
                fields={[
                  { name: "comments", label: "Comments on my workouts", type: "toggle", default: "1" },
                  { name: "coach", label: "Coach messages", type: "toggle", default: "1" },
                  { name: "followers", label: "New followers", type: "toggle", default: "0" },
                  { name: "goals", label: "Goal & event reminders", type: "toggle", default: "1" },
                  { name: "syncDone", label: "Sync completed", type: "toggle", default: "0" },
                ]}
              />
            )}

            {section === "export" && <ExportData />}

            {section === "nutrition" && (
              <div className="max-w-md">
                <SectionTitle>Nutrition</SectionTitle>
                <p className="mb-3 text-sm font-bold text-ink">Daily Targets</p>
                <div className="space-y-3">
                  <Field label="Calories"><input className={`${sel} w-32`} placeholder="kcal" /></Field>
                  <Field label="Carbohydrates"><input className={`${sel} w-32`} placeholder="g" /></Field>
                  <Field label="Protein"><input className={`${sel} w-32`} placeholder="g" /></Field>
                  <Field label="Fat"><input className={`${sel} w-32`} placeholder="g" /></Field>
                </div>
              </div>
            )}

            {section === "equipment" && (
              <EquipmentManager
                equipment={settings.equipment}
                units={athlete?.units ?? "imperial"}
              />
            )}

            {section === "layout" && (
              <PrefsForm
                title="Layout"
                section="layout"
                prefs={prefs}
                fields={[
                  { name: "homeLayout", label: "Home Layout", type: "select", options: ["Default", "Compact"] },
                  { name: "dashboardLayout", label: "Dashboard Layout", type: "select", options: ["Default", "Coach"] },
                  { name: "calendarDensity", label: "Calendar Density", type: "select", options: ["Comfortable", "Compact"] },
                ]}
              />
            )}

            {section === "weather" && (
              <PrefsForm
                title="Weather"
                section="weather"
                prefs={prefs}
                fields={[
                  { name: "provider", label: "Provider", type: "select", options: ["None", "OpenWeather"] },
                  { name: "units", label: "Units", type: "select", options: ["Fahrenheit", "Celsius"] },
                  { name: "showOnCalendar", label: "Show weather on calendar", type: "toggle", default: "0" },
                ]}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-5 border-t border-line px-5 py-3">
          <button onClick={() => router.push("/")} className="text-sm font-medium text-accent">
            Cancel
          </button>
          <button onClick={() => persistZones()} className="text-sm font-medium text-accent">
            Save
          </button>
          <button
            onClick={() => persistZones(() => router.push("/"))}
            className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
