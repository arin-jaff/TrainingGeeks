"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Modality, Units } from "@/lib/db/types";
import { MODALITY_LABEL, formatDistance, formatDuration } from "@/lib/util/format";
import SportIcon from "@/components/SportIcon";
import { deleteTemplate, duplicateTemplate, scheduleTemplate } from "@/app/actions/workoutTemplate";

export interface TemplateListItem {
  id: number;
  name: string;
  modality: Modality;
  summary: string;
  estDurationS: number | null;
  estDistanceM: number | null;
  estTss: number | null;
}

export default function WorkoutLibrary({
  templates,
  units,
}: {
  templates: TemplateListItem[];
  units: Units;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [scheduleFor, setScheduleFor] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");

  function remove(id: number) {
    start(async () => {
      await deleteTemplate(id);
      router.refresh();
    });
  }
  function duplicate(id: number) {
    start(async () => {
      await duplicateTemplate(id);
      router.refresh();
    });
  }
  function confirmSchedule(id: number) {
    if (!scheduleDate) return;
    start(async () => {
      await scheduleTemplate(id, scheduleDate);
      setScheduleFor(null);
      setScheduleDate("");
      router.push("/calendar");
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Workout Library</h1>
          <p className="text-sm text-ink-muted">
            Build structured workouts, schedule them, and export to your Garmin as a .FIT file.
          </p>
        </div>
        <Link
          href="/workout-library/new"
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          New Workout
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded border border-dashed border-line px-4 py-16 text-center">
          <p className="text-sm text-ink-muted">No workouts yet.</p>
          <Link
            href="/workout-library/new"
            className="mt-3 inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Build your first workout
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Workout</th>
                <th className="px-3 py-2 font-medium tabular-nums">Time</th>
                <th className="px-3 py-2 font-medium tabular-nums">Distance</th>
                <th className="px-3 py-2 font-medium tabular-nums">TSS</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {templates.map((t) => (
                <tr key={t.id} className="bg-surface-card align-top">
                  <td className="px-3 py-2.5">
                    <Link href={`/workout-library/${t.id}`} className="flex items-start gap-2">
                      <span className="mt-0.5">
                        <SportIcon modality={t.modality} size={16} />
                      </span>
                      <span>
                        <span className="block font-medium text-ink hover:text-accent">{t.name}</span>
                        <span className="block text-xs text-ink-muted">
                          {MODALITY_LABEL[t.modality]} · {t.summary || "No steps"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-ink">
                    {t.estDurationS != null ? formatDuration(t.estDurationS) : "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-ink">
                    {t.estDistanceM != null ? formatDistance(t.estDistanceM, units) : "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-ink">{t.estTss != null ? t.estTss : "—"}</td>
                  <td className="px-3 py-2.5">
                    {scheduleFor === t.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className="rounded border border-line px-2 py-1 text-xs text-ink outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => confirmSchedule(t.id)}
                          disabled={pending || !scheduleDate}
                          className="rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setScheduleFor(null)}
                          className="rounded px-1.5 text-xs text-ink-muted hover:text-ink"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <a
                          href={`/api/workout/fit?template=${t.id}`}
                          className="font-medium text-accent hover:underline"
                          title="Download a Garmin .FIT file"
                        >
                          Export
                        </a>
                        <button onClick={() => setScheduleFor(t.id)} className="text-ink-muted hover:text-accent">
                          Schedule
                        </button>
                        <button onClick={() => duplicate(t.id)} disabled={pending} className="text-ink-muted hover:text-accent disabled:opacity-50">
                          Duplicate
                        </button>
                        <Link href={`/workout-library/${t.id}`} className="text-ink-muted hover:text-accent">
                          Edit
                        </Link>
                        <button onClick={() => remove(t.id)} disabled={pending} className="text-ink-muted hover:text-fatigue disabled:opacity-50">
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
