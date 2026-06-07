"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InjuryRow } from "@/lib/db/repo";
import { addInjury, removeInjury, reopenInjury, resolveInjury } from "@/app/actions/injury";
import { diffDays } from "@/lib/util/dates";

const input = "rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent";

export default function InjuryPanel({
  injuries,
  today,
}: {
  injuries: InjuryRow[];
  today: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <section className="rounded border border-line bg-surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Injuries</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-lg leading-none text-ink-muted hover:text-accent"
          aria-label="Add injury"
        >
          +
        </button>
      </div>

      {adding && (
        <form
          action={async (fd) => {
            await addInjury(fd);
            setAdding(false);
            router.refresh();
          }}
          className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          <input name="title" placeholder="Injury (e.g. Left Achilles)" required className={input} />
          <input name="bodyPart" placeholder="Body part (optional)" className={input} />
          <label className="text-sm text-ink">
            Start date
            <input name="startDate" type="date" defaultValue={today} required className={`${input} mt-1 block w-full`} />
          </label>
          <input name="notes" placeholder="Notes (optional)" className={input} />
          <button className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover sm:col-span-2">
            Add Injury
          </button>
        </form>
      )}

      {injuries.length === 0 ? (
        <p className="text-sm text-ink-muted">No injuries logged.</p>
      ) : (
        <ul className="divide-y divide-line">
          {injuries.map((inj) => {
            const ongoing = !inj.end_date;
            const days = ongoing
              ? diffDays(inj.start_date, today) + 1
              : diffDays(inj.start_date, inj.end_date!) + 1;
            return (
              <li key={inj.id} className="flex items-center gap-3 py-2 text-sm">
                <span
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${ongoing ? "bg-fatigue" : "bg-modality-run"}`}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="font-medium text-ink">
                    {inj.title}
                    {inj.body_part && (
                      <span className="ml-1 text-ink-muted">· {inj.body_part}</span>
                    )}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {inj.start_date}
                    {ongoing ? " → ongoing" : ` → ${inj.end_date}`} · {days}d
                  </div>
                </div>
                <span className="ml-auto flex gap-3 text-xs">
                  {ongoing ? (
                    <button onClick={() => run(() => resolveInjury(inj.id))} className="font-medium text-accent">
                      Resolve
                    </button>
                  ) : (
                    <button onClick={() => run(() => reopenInjury(inj.id))} className="text-ink-muted hover:text-ink">
                      Reopen
                    </button>
                  )}
                  <button onClick={() => run(() => removeInjury(inj.id))} className="text-ink-muted hover:text-fatigue">
                    Delete
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
