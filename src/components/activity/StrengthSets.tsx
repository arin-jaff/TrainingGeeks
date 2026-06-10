"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StrengthSetRow, Units } from "@/lib/db/types";
import { exerciseDisplayName } from "@/lib/strength/naming";
import { saveStrengthSets } from "@/app/actions/strength";

const KG_PER_LB = 0.453592;

function toMS(sec: number | null): string {
  if (sec == null) return "";
  const t = Math.round(sec);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
function fromMS(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (!t.includes(":")) return Number.isFinite(+t) ? Math.round(+t) : null;
  const [m, sec] = t.split(":").map(Number);
  return Number.isFinite(m) && Number.isFinite(sec) ? m * 60 + sec : null;
}
const numOrNull = (s: string): number | null => {
  const n = Number(s.trim());
  return s.trim() !== "" && Number.isFinite(n) ? n : null;
};

interface Row {
  uid: number;
  exerciseKey: string;
  name: string;
  time: string;
  rest: string;
  reps: string;
  weight: string; // in display unit
}

let counter = 0;

export default function StrengthSets({
  activityId,
  sets,
  knownExercises,
  units,
  readOnly = false,
}: {
  activityId: number;
  sets: StrengthSetRow[];
  knownExercises: string[];
  units: Units;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const wUnit = units === "imperial" ? "lbs" : "kg";
  const toDisplayW = (kg: number | null) =>
    kg == null ? "" : String(Math.round(units === "imperial" ? kg / KG_PER_LB : kg));

  const [rows, setRows] = useState<Row[]>(() =>
    sets.map((s) => ({
      uid: counter++,
      exerciseKey: s.exercise_key,
      name: exerciseDisplayName(s.exercise_key, s.exercise_name),
      time: toMS(s.duration_s),
      rest: toMS(s.rest_s),
      reps: s.reps == null ? "" : String(s.reps),
      weight: toDisplayW(s.weight_kg),
    })),
  );

  const set = (uid: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const remove = (uid: number) => setRows((rs) => rs.filter((r) => r.uid !== uid));
  const add = () =>
    setRows((rs) => [
      ...rs,
      { uid: counter++, exerciseKey: "custom", name: "", time: "", rest: "", reps: "", weight: "" },
    ]);

  const save = () =>
    start(async () => {
      await saveStrengthSets(
        activityId,
        rows.map((r) => {
          const w = numOrNull(r.weight);
          return {
            exerciseKey: r.exerciseKey,
            exerciseName: r.name.trim(),
            reps: numOrNull(r.reps),
            durationS: fromMS(r.time),
            restS: fromMS(r.rest),
            weightKg: w == null ? null : units === "imperial" ? w * KG_PER_LB : w,
          };
        }),
      );
      router.refresh();
    });

  const inputCls = "rounded border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent";

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Sets</h3>
        {!readOnly && (
          <button
            onClick={save}
            disabled={pending}
            className="rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save sets"}
          </button>
        )}
      </div>

      <datalist id="known-exercises">
        {knownExercises.map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>

      <div className="overflow-x-auto rounded border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left text-xs text-ink-muted">
              {!readOnly && <th className="w-10 px-2 py-1.5" />}
              <th className="px-2 py-1.5">Exercise</th>
              <th className="w-20 px-2 py-1.5">Time</th>
              <th className="w-20 px-2 py-1.5">Rest</th>
              <th className="w-16 px-2 py-1.5">Reps</th>
              <th className="w-24 px-2 py-1.5">Weight</th>
              {!readOnly && <th className="w-8 px-2 py-1.5" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.uid} className="border-b border-line last:border-0">
                {!readOnly && (
                  <td className="px-1 py-1">
                    <div className="flex flex-col leading-none text-ink-muted">
                      <button onClick={() => move(i, -1)} aria-label="Move up" className="hover:text-accent">▲</button>
                      <button onClick={() => move(i, 1)} aria-label="Move down" className="hover:text-accent">▼</button>
                    </div>
                  </td>
                )}
                <td className="px-2 py-1">
                  {readOnly ? (
                    <span className="text-ink">{r.name || "Unnamed"}</span>
                  ) : (
                    <input
                      list="known-exercises"
                      value={r.name}
                      onChange={(e) => set(r.uid, { name: e.target.value })}
                      placeholder="Choose an exercise"
                      className={`${inputCls} w-full`}
                    />
                  )}
                </td>
                <Cell readOnly={readOnly} value={r.time} onChange={(v) => set(r.uid, { time: v })} cls={inputCls} placeholder="m:ss" />
                <Cell readOnly={readOnly} value={r.rest} onChange={(v) => set(r.uid, { rest: v })} cls={inputCls} placeholder="m:ss" />
                <Cell readOnly={readOnly} value={r.reps} onChange={(v) => set(r.uid, { reps: v })} cls={inputCls} />
                <td className="px-2 py-1">
                  {readOnly ? (
                    <span className="text-ink">{r.weight ? `${r.weight} ${wUnit}` : "—"}</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <input value={r.weight} onChange={(e) => set(r.uid, { weight: e.target.value })} placeholder="--" className={`${inputCls} w-14`} />
                      <span className="text-xs text-ink-muted">{wUnit}</span>
                    </span>
                  )}
                </td>
                {!readOnly && (
                  <td className="px-2 py-1">
                    <button onClick={() => remove(r.uid)} aria-label="Delete set" className="text-ink-muted hover:text-fatigue">
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <button onClick={add} className="mt-2 text-xs font-medium text-accent">
          + Add set
        </button>
      )}
    </section>
  );
}

function Cell({
  readOnly,
  value,
  onChange,
  cls,
  placeholder,
}: {
  readOnly: boolean;
  value: string;
  onChange: (v: string) => void;
  cls: string;
  placeholder?: string;
}) {
  return (
    <td className="px-2 py-1">
      {readOnly ? (
        <span className="text-ink">{value || "—"}</span>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${cls} w-full tabular-nums`} />
      )}
    </td>
  );
}
