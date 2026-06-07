"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PLANS } from "@/lib/training-plans/catalog";
import type { PlanWorkout, TrainingPlan } from "@/lib/training-plans/types";
import { planEndDate } from "@/lib/training-plans/apply";
import { applyPlan, removePlan } from "@/app/actions/plans";
import type { Modality, Units } from "@/lib/db/types";
import { MODALITY_COLOR } from "@/lib/util/colors";
import { formatDistance, formatDuration, MODALITY_LABEL } from "@/lib/util/format";

type Applied = Record<string, { start: string; end: string; count: number }>;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return `${m}/${day}/${String(y).slice(2)}`;
}

function sportMix(plan: TrainingPlan): { modality: Modality; n: number }[] {
  const counts = new Map<Modality, number>();
  for (const w of plan.workouts)
    if (w.modality) counts.set(w.modality, (counts.get(w.modality) ?? 0) + 1);
  return [...counts.entries()]
    .map(([modality, n]) => ({ modality, n }))
    .sort((a, b) => b.n - a.n);
}

function amount(w: PlanWorkout, units: Units): string {
  if (w.distanceM) return formatDistance(w.distanceM, units);
  if (w.durationS) return formatDuration(w.durationS);
  return "";
}

export default function TrainingPlansView({
  applied,
  defaultStart,
  units,
}: {
  applied: Applied;
  defaultStart: string;
  units: Units;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selectedId, setSelectedId] = useState<string>(PLANS[0]?.id ?? "");
  const [startDate, setStartDate] = useState(defaultStart);

  const plan = useMemo(
    () => PLANS.find((p) => p.id === selectedId) ?? PLANS[0],
    [selectedId],
  );

  const byWeek = useMemo(() => {
    const map = new Map<number, PlanWorkout[]>();
    for (const w of plan.workouts) {
      const arr = map.get(w.week) ?? [];
      arr.push(w);
      map.set(w.week, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [plan]);

  const isApplied = !!applied[plan.id];

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between border-b border-line pb-2">
        <h1 className="text-lg font-semibold text-ink">Training Plans</h1>
        <span className="text-xs text-ink-muted">
          Schedule a structured plan onto your calendar.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Plan list */}
        <div className="space-y-2">
          {PLANS.map((p) => {
            const ap = applied[p.id];
            const active = p.id === plan.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={[
                  "w-full rounded border p-3 text-left transition-colors",
                  active
                    ? "border-accent bg-accent/5"
                    : "border-line bg-surface-card hover:border-accent/40",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{p.name}</span>
                  {ap && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                      Scheduled
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                  <span>{p.distance}</span>
                  <span aria-hidden>·</span>
                  <span>{p.level}</span>
                  <span aria-hidden>·</span>
                  <span>{p.weeks} weeks</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {sportMix(p).map(({ modality, n }) => (
                    <span
                      key={modality}
                      className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[10px] text-ink-muted"
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: MODALITY_COLOR[modality] }}
                      />
                      {MODALITY_LABEL[modality]} {n}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Plan detail */}
        <div className="rounded border border-line bg-surface-card p-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink">{plan.name}</h2>
              <p className="text-xs text-ink-muted">
                {plan.source} · {plan.distance} · {plan.level} · {plan.weeks} weeks
              </p>
            </div>
            <div className="flex items-end gap-2">
              <label className="text-xs text-ink-muted">
                Start (Mon)
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block rounded border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent"
                />
              </label>
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await applyPlan(plan.id, startDate);
                    router.refresh();
                  })
                }
                className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {isApplied ? "Reschedule" : "Add to calendar"}
              </button>
              {isApplied && (
                <button
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await removePlan(plan.id);
                      router.refresh();
                    })
                  }
                  className="rounded border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-fatigue disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {isApplied ? (
            <p className="mt-3 text-xs text-accent">
              Scheduled {fmtDate(applied[plan.id].start)} – {fmtDate(applied[plan.id].end)} ·{" "}
              {applied[plan.id].count} workouts on your calendar.
            </p>
          ) : (
            <p className="mt-3 text-xs text-ink-muted">
              Ends {fmtDate(planEndDate(plan, startDate))} — rest days are left open.
            </p>
          )}

          {/* Week-by-week grid */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-ink-muted">
                  <th className="w-10 px-1 py-1 text-left font-medium">Wk</th>
                  {DAYS.map((d) => (
                    <th key={d} className="px-1 py-1 text-left font-medium">
                      {d.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byWeek.map(([week, workouts]) => {
                  const byDay = new Map(workouts.map((w) => [w.dayOfWeek, w]));
                  return (
                    <tr key={week} className="border-t border-line align-top">
                      <td className="px-1 py-1.5 font-semibold tabular-nums text-ink">{week}</td>
                      {DAYS.map((d) => {
                        const w = byDay.get(d);
                        if (!w || !w.modality)
                          return (
                            <td key={d} className="px-1 py-1.5 text-ink-muted/50">
                              {w ? "Rest" : ""}
                            </td>
                          );
                        return (
                          <td key={d} className="px-1 py-1.5">
                            <span
                              className="block border-l-2 pl-1.5 leading-tight"
                              style={{ borderColor: MODALITY_COLOR[w.modality] }}
                              title={w.description}
                            >
                              <span className="font-medium text-ink">{w.type}</span>
                              {amount(w, units) && (
                                <span className="block text-ink-muted">{amount(w, units)}</span>
                              )}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
