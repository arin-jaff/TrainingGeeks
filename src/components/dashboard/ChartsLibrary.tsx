"use client";

import { useState } from "react";

type Kind = "bar" | "line" | "pie";

const CHARTS: { name: string; kind: Kind }[] = [
  { name: "Calories by Time Period", kind: "bar" },
  { name: "Cardio Hours", kind: "bar" },
  { name: "Distance By Week/Day", kind: "bar" },
  { name: "Duration By Week/Day", kind: "bar" },
  { name: "Elevation Gain By Week/Day", kind: "bar" },
  { name: "Fitness History", kind: "bar" },
  { name: "Fitness Summary", kind: "pie" },
  { name: "Kilojoules By Week/Day", kind: "bar" },
  { name: "Longest Workout (Distance)", kind: "bar" },
  { name: "Longest Workout (Duration)", kind: "bar" },
  { name: "Macronutrients by Time Period", kind: "bar" },
  { name: "Metrics", kind: "line" },
  { name: "Peak Cadence", kind: "line" },
  { name: "Peak HR", kind: "line" },
  { name: "Peak Pace", kind: "line" },
  { name: "Peak Pace by Distance", kind: "line" },
  { name: "Peak Power", kind: "line" },
  { name: "Performance Management", kind: "line" },
  { name: "Time In Heart Rate Zones", kind: "bar" },
  { name: "Time In Power Zones", kind: "bar" },
  { name: "Time In Speed Zones", kind: "bar" },
];

function Icon({ kind }: { kind: Kind }) {
  const c = "#1a202e";
  if (kind === "pie")
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 12V3M12 12l7 4" />
      </svg>
    );
  if (kind === "line")
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l5-6 4 3 6-8" />
      </svg>
    );
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  );
}

export default function ChartsLibrary() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = CHARTS.filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-1 rounded border border-line bg-surface-card px-2 py-1.5 text-[11px] text-ink-muted hover:text-accent"
        title="Charts Library"
      >
        <Icon kind="bar" />
        Charts Library
      </button>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div
            className="absolute left-0 top-0 h-full w-80 overflow-y-auto border-r border-line bg-surface-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <h2 className="text-lg font-semibold text-ink">Charts Library</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-xl leading-none text-ink-muted hover:text-ink"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="px-4">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search"
                className="w-full rounded bg-surface px-3 py-2 text-sm outline-none"
              />
              <p className="mt-2 text-xs italic text-ink-muted">
                Drag charts to dashboard
              </p>
            </div>
            <ul className="mt-2">
              {filtered.map((c) => (
                <li
                  key={c.name}
                  draggable
                  className="flex cursor-grab items-center gap-3 border-t border-line px-4 py-3 text-sm font-semibold text-ink hover:bg-surface"
                >
                  <Icon kind={c.kind} />
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
