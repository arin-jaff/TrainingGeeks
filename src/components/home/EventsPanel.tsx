"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EventRow } from "@/lib/db/types";
import { addEvent, removeEvent } from "@/app/actions/home";
import { diffDays } from "@/lib/util/dates";

export default function EventsPanel({
  events,
  today,
}: {
  events: EventRow[];
  today: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <section className="rounded border border-line bg-surface-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Events</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-lg leading-none text-ink-muted hover:text-accent"
          aria-label="Add event"
        >
          +
        </button>
      </div>

      {events.length === 0 && !adding && (
        <div className="text-sm text-ink-muted">
          <p className="font-medium text-ink">What are you training for?</p>
          <p className="mt-1">
            Keep track of your upcoming events and stay focused with a
            countdown.
          </p>
        </div>
      )}

      <ul className="space-y-1">
        {events.map((e) => {
          const days = diffDays(today, e.date);
          return (
            <li
              key={e.id}
              className="flex items-center justify-between rounded px-1 py-1 text-sm hover:bg-surface"
            >
              <span className="text-ink">{e.name}</span>
              <span className="flex items-center gap-2 text-xs text-ink-muted">
                <span>{days >= 0 ? `${days}d` : "past"}</span>
                <button
                  onClick={() =>
                    startTransition(async () => {
                      await removeEvent(e.id);
                      router.refresh();
                    })
                  }
                  className="hover:text-fatigue"
                  aria-label="Remove event"
                >
                  ×
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      {adding && (
        <form
          action={async (fd) => {
            await addEvent(fd);
            setAdding(false);
            router.refresh();
          }}
          className="mt-2 space-y-2"
        >
          <input
            name="name"
            placeholder="Event name"
            required
            className="w-full rounded border border-line px-2 py-1 text-sm outline-none focus:border-accent"
          />
          <input
            name="date"
            type="date"
            required
            className="w-full rounded border border-line px-2 py-1 text-sm outline-none focus:border-accent"
          />
          <button className="rounded bg-accent px-3 py-1 text-sm font-medium text-white hover:bg-accent-hover">
            Add Event
          </button>
        </form>
      )}
    </section>
  );
}
