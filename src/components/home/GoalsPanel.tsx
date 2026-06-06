"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GoalRow } from "@/lib/db/types";
import { addGoal, removeGoal, toggleGoal } from "@/app/actions/home";

export default function GoalsPanel({ goals }: { goals: GoalRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();
  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  return (
    <section className="rounded border border-line bg-surface-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Goals</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-lg leading-none text-ink-muted hover:text-accent"
          aria-label="Add goal"
        >
          +
        </button>
      </div>

      {goals.length === 0 && !adding && (
        <p className="text-sm text-ink-muted">
          Stay on track by adding your training goals.
        </p>
      )}

      <ul className="space-y-1">
        {goals.map((g) => (
          <li key={g.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={g.done === 1}
              onChange={() => run(() => toggleGoal(g.id, g.done !== 1))}
              className="accent-accent"
            />
            <span
              className={g.done === 1 ? "text-ink-muted line-through" : "text-ink"}
            >
              {g.text}
            </span>
            <button
              onClick={() => run(() => removeGoal(g.id))}
              className="ml-auto text-xs text-ink-muted hover:text-fatigue"
              aria-label="Remove goal"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {adding && (
        <form
          action={async (fd) => {
            await addGoal(fd);
            setAdding(false);
            router.refresh();
          }}
          className="mt-2 flex gap-2"
        >
          <input
            name="text"
            placeholder="e.g. Two core sessions a week"
            required
            className="flex-1 rounded border border-line px-2 py-1 text-sm outline-none focus:border-accent"
          />
          <button className="rounded bg-accent px-3 py-1 text-sm font-medium text-white hover:bg-accent-hover">
            Add
          </button>
        </form>
      )}
    </section>
  );
}
