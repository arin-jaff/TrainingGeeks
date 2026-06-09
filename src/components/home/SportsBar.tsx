"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { SportSummary } from "@/lib/queries/sports";
import type { Modality, Units } from "@/lib/db/types";
import { formatDistance, formatDuration, formatPace } from "@/lib/util/format";
import SportImage from "@/components/SportImage";

function relDate(date: string, today: string): string {
  if (date === today) return "today";
  const a = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
  const b = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  const days = Math.round((b - a) / 86400000);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function Totals({
  t,
  modality,
  units,
}: {
  t: SportSummary["week"];
  modality: Modality;
  units: Units;
}) {
  const strength = modality === "lift" || modality === "core";
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
      <span className="text-ink-muted">Sessions</span>
      <span className="text-right font-semibold tabular-nums text-ink">{t.count}</span>
      <span className="text-ink-muted">Time</span>
      <span className="text-right font-semibold tabular-nums text-ink">
        {t.durationS > 0 ? formatDuration(t.durationS) : "—"}
      </span>
      {!strength && (
        <>
          <span className="text-ink-muted">Distance</span>
          <span className="text-right font-semibold tabular-nums text-ink">
            {t.distanceM > 0 ? formatDistance(t.distanceM, units) : "—"}
          </span>
        </>
      )}
      <span className="text-ink-muted">{strength ? "S³" : "TSS"}</span>
      <span className="text-right font-semibold tabular-nums text-ink">
        {Math.round(strength ? t.s3 : t.tss)}
      </span>
    </div>
  );
}

function Panel({
  s,
  units,
  today,
}: {
  s: SportSummary;
  units: Units;
  today: string;
}) {
  const last = s.last;
  return (
    <div className="absolute left-0 top-full z-40 mt-2 w-72 rounded-md border border-line bg-surface-card p-3 text-left shadow-xl">
      <div className="mb-2 flex items-center gap-2">
        <SportImage modality={s.modality} size={26} />
        <span className="text-sm font-semibold text-ink">{s.label}</span>
      </div>

      {last ? (
        <Link href={`/activity/${last.id}`} className="group block">
          <div className="rounded border border-line bg-surface px-2 py-1.5">
            <div className="flex items-baseline justify-between">
              <span className="truncate text-[12px] font-medium text-ink group-hover:text-accent">
                {last.name}
              </span>
              <span className="ml-2 shrink-0 text-[10px] text-ink-muted">
                {relDate(last.date, today)}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-ink-muted">
              {last.durationS != null && <span>{formatDuration(last.durationS)}</span>}
              {last.distanceM != null && <span>{formatDistance(last.distanceM, units)}</span>}
              {last.avgSpeedMps != null && s.modality !== "lift" && s.modality !== "core" && (
                <span>{formatPace(last.avgSpeedMps, units, s.modality)}</span>
              )}
              {last.stress != null && (
                <span>
                  {Math.round(last.stress)} {last.stressLabel}
                </span>
              )}
            </div>
          </div>
        </Link>
      ) : (
        <p className="rounded border border-line bg-surface px-2 py-1.5 text-[11px] text-ink-muted">
          No {s.label.toLowerCase()} activities yet.
        </p>
      )}

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Last 7 days
          </p>
          <Totals t={s.week} modality={s.modality} units={units} />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            All time
          </p>
          <Totals t={s.allTime} modality={s.modality} units={units} />
        </div>
      </div>
    </div>
  );
}

export default function SportsBar({
  sports,
  units,
  today,
}: {
  sports: SportSummary[];
  units: Units;
  today: string;
}) {
  const [active, setActive] = useState<Modality | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = (m: Modality) => {
    if (timer.current) clearTimeout(timer.current);
    setActive(m);
  };
  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(null), 120);
  };

  return (
    <div className="mb-4 rounded border border-line bg-surface-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink">Your Sports</h2>
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {sports.map((s) => (
          <div
            key={s.modality}
            className="relative"
            onMouseEnter={() => open(s.modality)}
            onMouseLeave={close}
          >
            <button
              type="button"
              className="flex w-16 flex-col items-center gap-1.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`${s.label} stats`}
            >
              <SportImage
                modality={s.modality}
                size={52}
                className={`transition-transform ${active === s.modality ? "scale-110" : "hover:scale-105"}`}
              />
              <span className="text-xs font-medium text-ink-muted">{s.label}</span>
            </button>
            {active === s.modality && <Panel s={s} units={units} today={today} />}
          </div>
        ))}
      </div>
    </div>
  );
}
