"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EquipmentRow, InjuryRow } from "@/lib/db/repo";
import type { Modality, Units } from "@/lib/db/types";
import { MODALITY_LABEL } from "@/lib/util/format";
import { WELLNESS_TYPES } from "@/lib/metrics/wellness";
import SportIcon from "@/components/SportIcon";
import { addMetric } from "@/app/actions/metrics";
import { addInjury, resolveInjury } from "@/app/actions/injury";
import WorkoutModal from "./WorkoutModal";

const WORKOUTS: Modality[] = ["run", "bike", "swim", "row", "lift", "core"];

function titleFor(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function AddMenuModal({
  date,
  units,
  today,
  equipment,
  openInjuries,
  onClose,
}: {
  date: string;
  units: Units;
  today: string;
  equipment: EquipmentRow[];
  openInjuries: InjuryRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [view, setView] = useState<"menu" | "metrics" | "injury" | Modality>("menu");

  // A workout type was chosen → hand off to the full quick-add form.
  if (view !== "menu" && view !== "metrics" && view !== "injury") {
    return (
      <WorkoutModal
        date={date}
        modality={view}
        units={units}
        today={today}
        equipment={equipment}
        onClose={onClose}
      />
    );
  }

  const btn =
    "flex items-center gap-2 rounded border border-line bg-surface-card px-3 py-2.5 text-sm text-ink hover:border-accent/50 hover:bg-surface";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="my-6 w-full max-w-2xl rounded-lg bg-surface-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pb-2 pt-5">
          <h2 className="text-[26px] font-normal leading-tight text-ink">{titleFor(date)}</h2>
          <button onClick={onClose} className="text-xl leading-none text-ink-muted hover:text-ink" aria-label="Close">
            ×
          </button>
        </div>

        {view === "menu" && (
          <div className="px-6 pb-6">
            <p className="mb-2 mt-2 text-sm text-ink">Add a Workout</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {WORKOUTS.map((m) => (
                <button key={m} onClick={() => setView(m)} className={btn}>
                  <SportIcon modality={m} size={18} />
                  {MODALITY_LABEL[m]}
                </button>
              ))}
            </div>

            <p className="mb-2 mt-6 text-sm text-ink">Add Other</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button onClick={() => setView("metrics")} className={btn}>
                <MetricsGlyph /> Metrics
              </button>
              <button onClick={() => setView("injury")} className={btn}>
                <InjuryGlyph /> Injury
              </button>
            </div>
          </div>
        )}

        {view === "metrics" && (
          <div className="px-6 pb-6">
            <BackLink onClick={() => setView("menu")} />
            <form
              action={(fd) => {
                fd.set("date", date);
                start(async () => {
                  await addMetric(fd);
                  router.refresh();
                  onClose();
                });
              }}
              className="mt-3 space-y-3"
            >
              <label className="block text-xs font-medium text-ink-muted">
                Metric
                <select name="type" className="mt-1 block w-full rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent">
                  {WELLNESS_TYPES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label} ({w.unit})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-ink-muted">
                Value
                <input name="value" type="number" step="any" required className="mt-1 block w-full rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent" />
              </label>
              <input name="notes" placeholder="Notes (optional)" className="block w-full rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent" />
              <SaveRow pending={pending} onCancel={onClose} />
            </form>
          </div>
        )}

        {view === "injury" && (
          <div className="px-6 pb-6">
            <BackLink onClick={() => setView("menu")} />
            <form
              action={(fd) => {
                fd.set("startDate", date);
                start(async () => {
                  await addInjury(fd);
                  router.refresh();
                  onClose();
                });
              }}
              className="mt-3 space-y-3"
            >
              <input name="title" placeholder="Injury (e.g. Left Achilles)" required className="block w-full rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent" />
              <input name="bodyPart" placeholder="Body part (optional)" className="block w-full rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent" />
              <input name="notes" placeholder="Notes (optional)" className="block w-full rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent" />
              <p className="text-xs text-ink-muted">Starts {date}.</p>
              <SaveRow pending={pending} onCancel={onClose} label="Start injury" />
            </form>

            {openInjuries.length > 0 && (
              <div className="mt-5 border-t border-line pt-3">
                <p className="mb-2 text-xs font-medium text-ink-muted">End an ongoing injury on {date}</p>
                <ul className="space-y-1.5">
                  {openInjuries.map((inj) => (
                    <li key={inj.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink">
                        {inj.title}
                        {inj.body_part && <span className="text-ink-muted"> · {inj.body_part}</span>}
                      </span>
                      <button
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await resolveInjury(inj.id, date);
                            router.refresh();
                            onClose();
                          })
                        }
                        className="text-xs font-medium text-accent disabled:opacity-50"
                      >
                        End here
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs font-medium text-accent">
      ‹ Back
    </button>
  );
}

function SaveRow({ pending, onCancel, label = "Save" }: { pending: boolean; onCancel: () => void; label?: string }) {
  return (
    <div className="flex items-center justify-end gap-4 pt-1">
      <button type="button" onClick={onCancel} disabled={pending} className="text-sm text-ink-muted hover:text-ink">
        Cancel
      </button>
      <button type="submit" disabled={pending} className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
        {label}
      </button>
    </div>
  );
}

function MetricsGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a0c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2 5 4-12 2 7h6" />
    </svg>
  );
}

function InjuryGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e63788" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
    </svg>
  );
}
