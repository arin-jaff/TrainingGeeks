"use client";

import { useEffect, useState } from "react";
import { getFriendData } from "@/app/actions/federation";
import type { Modality, Units } from "@/lib/db/types";
import { formatDistance, formatDuration, formatPace } from "@/lib/util/format";

interface CalItem {
  kind: string;
  date: string;
  modality: Modality;
  name: string | null;
  durationS: number | null;
  distanceM: number | null;
  tss: number | null;
  s3: number | null;
}
interface Activity extends CalItem {
  id: number;
  avgHr: number | null;
}
interface Pmc {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}
interface Peak {
  window: number;
  speed: number;
}

export default function FriendData({
  handle,
  scopes,
  units,
  onClose,
}: {
  handle: string;
  scopes: string[];
  units: Units;
  onClose: () => void;
}) {
  const [scope, setScope] = useState(scopes[0] ?? "calendar");
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    setData(null);
    getFriendData(handle, scope).then((r) => {
      if (!live) return;
      if (r.ok) setData(r.data);
      else setError(r.error ?? "Could not load");
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [handle, scope]);

  return (
    <div className="mt-3 rounded border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">@{handle}&apos;s shared data</span>
        <button onClick={onClose} className="text-xs text-ink-muted hover:text-ink">
          Close
        </button>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {scopes.map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={[
              "rounded px-2.5 py-1 text-xs font-medium",
              scope === s ? "bg-accent text-white" : "border border-line text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {error && <p className="text-sm text-fatigue">{error}</p>}
      {!loading && !error && data != null && (
        <Rendered scope={scope} data={data} units={units} />
      )}
    </div>
  );
}

function Rendered({
  scope,
  data,
  units,
}: {
  scope: string;
  data: unknown;
  units: Units;
}) {
  if (scope === "pmc") {
    const curve = (data as { curve: Pmc[] }).curve ?? [];
    const last = curve[curve.length - 1];
    if (!last) return <Empty />;
    return (
      <div className="flex gap-6 text-sm">
        <Stat label="Fitness" value={Math.round(last.ctl)} color="#1840ec" />
        <Stat label="Fatigue" value={Math.round(last.atl)} color="#e63788" />
        <Stat label="Form" value={Math.round(last.tsb)} color="#fd6b00" />
        <span className="self-end text-xs text-ink-muted">over {curve.length} days</span>
      </div>
    );
  }

  if (scope === "peaks") {
    const bests = (data as { bests: Peak[] }).bests ?? [];
    if (bests.length === 0) return <Empty />;
    return (
      <ul className="space-y-1 text-sm">
        {bests.map((b) => (
          <li key={b.window} className="flex items-center gap-3">
            <span className="w-16 font-semibold tabular-nums text-ink">
              {formatDuration(b.window / b.speed)}
            </span>
            <span className="text-ink-muted">{distLabelStatic(b.window)}</span>
            <span className="ml-auto text-xs text-ink-muted">{formatPace(b.speed, units, "run")}</span>
          </li>
        ))}
      </ul>
    );
  }

  // calendar | activities — a recent-first list.
  const items: (CalItem | Activity)[] =
    scope === "activities"
      ? (data as { activities: Activity[] }).activities ?? []
      : (data as { items: CalItem[] }).items ?? [];
  if (items.length === 0) return <Empty />;
  const sorted = [...items].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 40);
  return (
    <ul className="divide-y divide-line text-sm">
      {sorted.map((it, i) => {
        const strength = it.modality === "lift" || it.modality === "core";
        return (
          <li key={i} className="flex items-center gap-3 py-1.5">
            <span className="w-24 shrink-0 text-xs text-ink-muted">{it.date}</span>
            <span className="min-w-0 flex-1 truncate text-ink">
              {it.name || it.modality}
              {it.kind === "planned" && <span className="ml-1 text-xs italic text-ink-muted">planned</span>}
            </span>
            {it.durationS != null && (
              <span className="shrink-0 text-xs text-ink-muted">{formatDuration(it.durationS)}</span>
            )}
            {it.distanceM != null && (
              <span className="shrink-0 text-xs text-ink-muted">{formatDistance(it.distanceM, units)}</span>
            )}
            {(strength ? it.s3 : it.tss) != null && (
              <span className="w-14 shrink-0 text-right text-xs font-medium text-ink">
                {Math.round((strength ? it.s3 : it.tss) as number)} {strength ? "S³" : "TSS"}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function distLabelStatic(m: number): string {
  if (Math.abs(m - 1609.34) < 1) return "1 mi";
  if (m >= 1000) return `${m / 1000} km`;
  return `${m} m`;
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px]" style={{ color }}>{label}</span>
      <span className="text-lg font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-ink-muted">Nothing shared in this window.</p>;
}
