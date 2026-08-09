"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dismissDuplicate, mergeDuplicate } from "@/app/actions/duplicates";
import { useReadOnly } from "@/components/ReadOnly";
import type { DupeFieldRow, DupePair, DupeSide, FieldKind } from "@/lib/queries/duplicates";
import type { Modality, Units } from "@/lib/db/types";
import { MODALITY_COLOR } from "@/lib/util/colors";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  MODALITY_LABEL,
} from "@/lib/util/format";

const CONFIDENCE_STYLE: Record<DupePair["confidence"], string> = {
  high: "border-fatigue/40 bg-fatigue/10 text-fatigue",
  medium: "border-form/50 bg-form/10 text-form",
  low: "border-line bg-surface text-ink-muted",
};

function isEmpty(v: number | string | null): boolean {
  return v == null || (typeof v === "string" && v.trim() === "");
}

function formatValue(
  kind: FieldKind,
  v: number | string | null,
  units: Units,
  modality: Modality,
): string {
  if (isEmpty(v)) return "—";
  const n = Number(v);
  switch (kind) {
    case "duration":
      return formatDuration(n);
    case "distance":
      return formatDistance(n, units);
    case "elevation":
      return units === "imperial"
        ? `${Math.round(n * 3.28084)} ft`
        : `${Math.round(n)} m`;
    case "speed":
      return modality === "bike"
        ? formatSpeed(n, units)
        : formatPace(n, units, modality);
    case "number":
      return String(Math.round(n));
    case "decimal":
      return n.toFixed(2);
    default:
      return String(v);
  }
}

function clockTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

function longDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function gap(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return formatDuration(seconds);
}

function SideCard({
  side,
  pairKey,
  keeping,
  onKeep,
  units,
  tz,
}: {
  side: DupeSide;
  pairKey: string;
  keeping: boolean;
  onKeep: () => void;
  units: Units;
  tz: string;
}) {
  const badges: string[] = [];
  if (side.hasStream) {
    badges.push(
      side.samples > 0 ? `${side.samples.toLocaleString()} samples` : "Streams",
    );
  }
  if (side.laps > 1) badges.push(`${side.laps} laps`);
  if (side.photos > 0) badges.push(`${side.photos} photo${side.photos > 1 ? "s" : ""}`);

  return (
    <label
      className={[
        "flex cursor-pointer gap-3 rounded border p-3 transition-colors",
        keeping ? "border-accent bg-accent/5" : "border-line hover:border-accent/40",
      ].join(" ")}
    >
      <input
        type="radio"
        name={`keep-${pairKey}`}
        checked={keeping}
        onChange={onKeep}
        className="mt-1 accent-accent"
        aria-label={`Keep ${side.name ?? MODALITY_LABEL[side.modality]}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: MODALITY_COLOR[side.modality] }}
            aria-hidden
          />
          <span className="truncate text-sm font-semibold text-ink">
            {side.name ?? MODALITY_LABEL[side.modality]}
          </span>
          {keeping && (
            <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Keeping
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
          <span>{clockTime(side.startTime, tz)}</span>
          <span>{formatDuration(side.durationS)}</span>
          <span>{formatDistance(side.distanceM, units)}</span>
          <span className="capitalize">{side.source}</span>
        </div>
        {badges.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-muted"
              >
                {b}
              </span>
            ))}
          </div>
        )}
        <Link
          href={`/activity/${side.id}`}
          target="_blank"
          className="mt-1.5 inline-block text-xs font-medium text-accent hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Open activity →
        </Link>
      </div>
    </label>
  );
}

function PairCard({ pair, units, tz }: { pair: DupePair; units: Units; tz: string }) {
  const router = useRouter();
  const readOnly = useReadOnly();
  const [keepId, setKeepId] = useState(pair.recommendKeep);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const keep = pair.a.id === keepId ? pair.a : pair.b;
  const drop = pair.a.id === keepId ? pair.b : pair.a;
  const valueFor = (f: DupeFieldRow, id: number) => (pair.a.id === id ? f.a : f.b);

  // Default: pull anything the survivor is missing. Flipping which side you
  // keep re-derives the defaults, so the checkboxes always mean "take this
  // value from the duplicate".
  //
  // The empty-duplicate guard lives HERE rather than only on the rendered row:
  // a tick the user set before flipping the keeper survives in `overrides`, and
  // if the flip leaves the duplicate's side empty, a payload built from a
  // laxer predicate would copy NULL over the survivor's own value — silently,
  // while the row shows an unchecked, disabled box.
  const isChecked = (f: DupeFieldRow) =>
    !isEmpty(valueFor(f, drop.id)) &&
    (overrides[f.key] ?? isEmpty(valueFor(f, keep.id)));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong");
      else router.refresh();
    });

  const fields = pair.fields;
  const takeCount = fields.filter(isChecked).length;

  return (
    <section className="rounded border border-line bg-surface-card">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-semibold text-ink">{longDate(pair.a.localDate)}</h2>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CONFIDENCE_STYLE[pair.confidence]}`}
        >
          {pair.confidence} match
        </span>
        <span className="text-xs text-ink-muted">
          {pair.timed
            ? `${Math.round(pair.overlap * 100)}% time overlap · starts ${gap(pair.startDeltaS)} apart`
            : "Same day and sport with matching numbers — one of these was entered by hand, so neither start time is recorded"}
        </span>
      </header>

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <SideCard
          side={pair.a}
          pairKey={pair.key}
          keeping={keepId === pair.a.id}
          onKeep={() => setKeepId(pair.a.id)}
          units={units}
          tz={tz}
        />
        <SideCard
          side={pair.b}
          pairKey={pair.key}
          keeping={keepId === pair.b.id}
          onKeep={() => setKeepId(pair.b.id)}
          units={units}
          tz={tz}
        />
      </div>

      {fields.length > 0 && (
        <div className="px-4 pb-4">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-ink-muted">
                <th className="py-1 text-left font-medium">Field</th>
                <th className="px-2 py-1 text-right font-medium">Keeping</th>
                <th className="px-2 py-1 text-right font-medium">Duplicate</th>
                <th className="py-1 text-right font-medium">Take</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => {
                const keepValue = valueFor(f, keep.id);
                const dropValue = valueFor(f, drop.id);
                const takeable = !isEmpty(dropValue);
                const checked = isChecked(f);
                return (
                  <tr key={f.key} className="border-t border-line">
                    <td className="py-1 text-ink">{f.label}</td>
                    <td
                      className={`px-2 py-1 text-right tabular-nums ${checked ? "text-ink-muted line-through" : "text-ink"}`}
                    >
                      {formatValue(f.kind, keepValue, units, keep.modality)}
                    </td>
                    <td
                      className={`px-2 py-1 text-right tabular-nums ${checked ? "font-semibold text-ink" : "text-ink-muted"}`}
                    >
                      {formatValue(f.kind, dropValue, units, drop.modality)}
                    </td>
                    <td className="py-1 text-right">
                      <input
                        type="checkbox"
                        className="accent-accent"
                        checked={checked}
                        disabled={!takeable || readOnly}
                        onChange={(e) =>
                          setOverrides((o) => ({ ...o, [f.key]: e.target.checked }))
                        }
                        aria-label={`Take ${f.label} from the duplicate`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <button
          type="button"
          disabled={pending || readOnly}
          onClick={() =>
            run(() =>
              mergeDuplicate(
                keep.id,
                drop.id,
                fields.filter(isChecked).map((f) => f.key),
              ),
            )
          }
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Merging…" : "Merge and delete duplicate"}
        </button>
        <button
          type="button"
          disabled={pending || readOnly}
          onClick={() => run(() => dismissDuplicate(pair.a.id, pair.b.id))}
          className="rounded border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-accent hover:text-accent disabled:opacity-50"
        >
          Not a duplicate
        </button>
        <span className="text-xs text-ink-muted">
          Keeps {keep.name ?? MODALITY_LABEL[keep.modality]}
          {takeCount > 0 && `, taking ${takeCount} field${takeCount > 1 ? "s" : ""} from the duplicate`}
          . Photos and any streams the survivor lacks are carried over.
        </span>
        {error && <span className="text-xs font-medium text-fatigue">{error}</span>}
      </footer>
    </section>
  );
}

export default function DuplicateReview({
  pairs,
  units,
  tz,
}: {
  pairs: DupePair[];
  units: Units;
  tz: string;
}) {
  if (pairs.length === 0) {
    return (
      <div className="rounded border border-line bg-surface-card p-8 text-center">
        <p className="text-sm font-medium text-ink">No duplicates found.</p>
        <p className="mt-1 text-sm text-ink-muted">
          Activities recorded over the same stretch of clock show up here for review.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {pairs.map((p) => (
        <PairCard key={p.key} pair={p} units={units} tz={tz} />
      ))}
    </div>
  );
}
