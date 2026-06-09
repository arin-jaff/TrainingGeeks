"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EquipmentRow } from "@/lib/db/repo";
import type { Modality, Units } from "@/lib/db/types";
import { isCardio } from "@/lib/db/types";
import { MODALITY_LABEL } from "@/lib/util/format";
import { computeS3 } from "@/lib/metrics/strength";
import SportIcon from "@/components/SportIcon";
import FilesModal from "@/components/activity/FilesModal";
import {
  saveWorkout,
  deleteWorkout,
  type WorkoutEditData,
} from "@/app/actions/workout";

// ---- unit + value parsing helpers --------------------------------------

function unitDist(units: Units): number {
  return units === "imperial" ? 1609.34 : 1000;
}

/** "1:05:36" → 3936s, "48:11" → 2891s, "30" → 1800s (bare = minutes). */
function parseDuration(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (!t.includes(":")) {
    const m = Number(t);
    return Number.isFinite(m) ? Math.round(m * 60) : null;
  }
  const parts = t.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return Math.round(sec);
}

function fmtDuration(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "";
  const t = Math.round(sec); // round first to avoid m:60 / s:60 carry
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const num = (s: string): number | null => {
  const n = Number(s.trim());
  return s.trim() !== "" && Number.isFinite(n) ? n : null;
};

function paceToSpeed(s: string, modality: Modality, units: Units): number | null {
  const t = s.trim();
  if (!t || !t.includes(":")) return null;
  const [m, sec] = t.split(":").map((p) => Number(p));
  if (!Number.isFinite(m) || !Number.isFinite(sec)) return null;
  const perSec = m * 60 + sec;
  if (perSec <= 0) return null;
  const unit = modality === "swim" ? 100 : unitDist(units);
  return unit / perSec;
}

function speedToPace(speed: number | null, modality: Modality, units: Units): string {
  if (!speed || speed <= 0) return "";
  const unit = modality === "swim" ? 100 : unitDist(units);
  const total = Math.round(unit / speed); // round first to avoid m:60 carry
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const ftPerM = 3.28084;

// ---- component ----------------------------------------------------------

type StrMap = Record<string, string>;

export default function WorkoutModal({
  date,
  modality,
  units,
  today,
  equipment,
  initial,
  onClose,
}: {
  date: string;
  modality: Modality;
  units: Units;
  today: string;
  equipment: EquipmentRow[];
  initial?: WorkoutEditData | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const cardio = isCardio(modality);
  const isFuture = date > today;
  const editing = !!(initial?.plannedId || initial?.activityId);

  const distUnit = units === "imperial" ? "mi" : "km";
  const elevUnit = units === "imperial" ? "ft" : "m";
  const stressLabel = modality === "lift" || modality === "core" ? "S³" : cardio && (modality === "run" || modality === "swim") ? "rTSS" : "TSS";

  // Seed display strings from initial SI values.
  const seed = useMemo(() => {
    const p: StrMap = {};
    const c: StrMap = {};
    if (initial?.planned) {
      p.duration = fmtDuration(initial.planned.durationS);
      p.distance = initial.planned.distanceM != null ? (initial.planned.distanceM / unitDist(units)).toFixed(2) : "";
      p.tss = initial.planned.tss != null ? String(Math.round(initial.planned.tss)) : "";
    }
    if (initial?.completed) {
      const cc = initial.completed;
      c.duration = fmtDuration(cc.durationS);
      c.distance = cc.distanceM != null ? (cc.distanceM / unitDist(units)).toFixed(2) : "";
      c.pace = speedToPace(cc.avgSpeedMps, modality, units);
      c.calories = cc.calories != null ? String(Math.round(cc.calories)) : "";
      c.elevation = cc.elevationGainM != null ? String(Math.round(cc.elevationGainM * (units === "imperial" ? ftPerM : 1))) : "";
      c.tss = cc.stress != null ? String(Math.round(cc.stress)) : "";
      c.if = cc.intensityFactor != null ? String(cc.intensityFactor) : "";
      c.work = cc.workKj != null ? String(Math.round(cc.workKj)) : "";
      c.avgHr = cc.avgHr != null ? String(Math.round(cc.avgHr)) : "";
      c.maxHr = cc.maxHr != null ? String(Math.round(cc.maxHr)) : "";
      c.avgPower = cc.avgPower != null ? String(Math.round(cc.avgPower)) : "";
      c.maxPower = cc.maxPower != null ? String(Math.round(cc.maxPower)) : "";
      c.rpe = cc.rpe != null ? String(cc.rpe) : "";
    }
    return { p, c };
  }, [initial, modality, units]);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [privateNotes, setPrivateNotes] = useState(initial?.privateNotes ?? "");
  const [planned, setPlanned] = useState<StrMap>(seed.p);
  const [completed, setCompleted] = useState<StrMap>(seed.c);
  const [equipmentId, setEquipmentId] = useState<string>("");
  const [filesOpen, setFilesOpen] = useState(false);

  const eqOptions = equipment.filter(
    (e) => (modality === "run" && e.type === "shoes") || (modality === "bike" && e.type === "bike"),
  );

  // Live S³ preview for strength.
  const s3Preview = useMemo(() => {
    if (cardio) return null;
    const d = parseDuration(completed.duration ?? "");
    if (!d) return null;
    return computeS3(d, num(completed.rpe ?? "") ?? undefined);
  }, [cardio, completed.duration, completed.rpe]);

  function buildInput() {
    const toMeters = (s: string) => {
      const n = num(s);
      return n == null ? null : Math.round(n * unitDist(units));
    };
    const toMetersElev = (s: string) => {
      const n = num(s);
      return n == null ? null : n / (units === "imperial" ? ftPerM : 1);
    };
    return {
      date,
      modality,
      name,
      description,
      privateNotes,
      plannedId: initial?.plannedId ?? null,
      activityId: initial?.activityId ?? null,
      planned: {
        durationS: parseDuration(planned.duration ?? ""),
        distanceM: cardio ? toMeters(planned.distance ?? "") : null,
        tss: num(planned.tss ?? ""),
      },
      completed: isFuture
        ? null
        : {
            durationS: parseDuration(completed.duration ?? ""),
            distanceM: cardio ? toMeters(completed.distance ?? "") : null,
            avgSpeedMps: cardio ? paceToSpeed(completed.pace ?? "", modality, units) : null,
            calories: num(completed.calories ?? ""),
            elevationGainM: cardio ? toMetersElev(completed.elevation ?? "") : null,
            stress: num(completed.tss ?? ""),
            intensityFactor: cardio ? num(completed.if ?? "") : null,
            workKj: cardio ? num(completed.work ?? "") : null,
            avgHr: num(completed.avgHr ?? ""),
            maxHr: num(completed.maxHr ?? ""),
            avgPower: modality === "bike" ? num(completed.avgPower ?? "") : null,
            maxPower: modality === "bike" ? num(completed.maxPower ?? "") : null,
            rpe: num(completed.rpe ?? ""),
          },
      equipmentId: equipmentId ? Number(equipmentId) : null,
    };
  }

  function save() {
    start(async () => {
      await saveWorkout(buildInput());
      router.refresh();
      onClose();
    });
  }

  function remove() {
    start(async () => {
      await deleteWorkout({
        plannedId: initial?.plannedId ?? null,
        activityId: initial?.activityId ?? null,
      });
      router.refresh();
      onClose();
    });
  }

  // Field rows: which metrics show, and whether the planned cell is editable.
  type Row = { key: string; label: string; unit: string; plannedEditable: boolean; kind?: "pace" };
  const rows: Row[] = cardio
    ? [
        { key: "duration", label: "Duration", unit: "h:m:s", plannedEditable: true },
        { key: "distance", label: "Distance", unit: distUnit, plannedEditable: true },
        { key: "pace", label: "Avg Pace", unit: modality === "swim" ? "/100m" : `/${distUnit}`, plannedEditable: false, kind: "pace" },
        { key: "calories", label: "Calories", unit: "kcal", plannedEditable: false },
        { key: "elevation", label: "Elevation Gain", unit: elevUnit, plannedEditable: false },
        { key: "tss", label: stressLabel, unit: stressLabel, plannedEditable: true },
        { key: "if", label: "IF", unit: "", plannedEditable: false },
        ...(modality === "bike" ? [{ key: "work", label: "Work", unit: "kJ", plannedEditable: false }] : []),
        { key: "avgHr", label: "Avg HR", unit: "bpm", plannedEditable: false },
        { key: "maxHr", label: "Max HR", unit: "bpm", plannedEditable: false },
        ...(modality === "bike"
          ? [
              { key: "avgPower", label: "Avg Power", unit: "W", plannedEditable: false },
              { key: "maxPower", label: "Max Power", unit: "W", plannedEditable: false },
            ]
          : []),
        { key: "rpe", label: "RPE", unit: "1–10", plannedEditable: false },
      ]
    : [
        { key: "duration", label: "Duration", unit: "h:m:s", plannedEditable: true },
        { key: "rpe", label: "RPE", unit: "1–10", plannedEditable: false },
        { key: "calories", label: "Calories", unit: "kcal", plannedEditable: false },
      ];

  const inputCls =
    "w-full rounded border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent tabular-nums";
  const disabledCls = "w-full rounded border border-line bg-surface px-2 py-1 text-sm";

  const title = new Date(`${date}T00:00:00Z`).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="my-6 w-full max-w-3xl rounded-lg bg-surface-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-6 pb-3 pt-5">
          <div>
            <h2 className="text-[26px] font-normal leading-tight text-ink">{title}</h2>
            <div className="mt-2 flex items-center gap-2">
              <SportIcon modality={modality} size={18} />
              <span className="text-sm font-medium text-ink">{MODALITY_LABEL[modality]}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {initial?.activityId && (
              <button
                onClick={() => setFilesOpen(true)}
                className="flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-accent hover:text-accent"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
                Files
              </button>
            )}
            <button onClick={onClose} className="text-xl leading-none text-ink-muted hover:text-ink" aria-label="Close">
              ×
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Workout"
            className="mb-4 w-full rounded border border-line px-3 py-2 text-sm font-medium text-ink outline-none focus:border-accent"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_240px]">
            {/* Metrics grid */}
            <div>
              <div className="grid grid-cols-[120px_1fr_1fr_44px] items-center gap-x-2 gap-y-1.5">
                <span />
                <span className="text-center text-xs font-semibold text-ink">Planned</span>
                <span className="text-center text-xs font-semibold text-ink">Completed</span>
                <span />
                {rows.map((r) => (
                  <FieldRow
                    key={r.key}
                    row={r}
                    units={units}
                    modality={modality}
                    planned={planned}
                    setPlanned={setPlanned}
                    completed={completed}
                    setCompleted={setCompleted}
                    isFuture={isFuture}
                    inputCls={inputCls}
                    disabledCls={disabledCls}
                  />
                ))}
              </div>

              {!cardio && s3Preview != null && (
                <p className="mt-2 text-xs text-ink-muted">
                  Computed S³: <span className="font-semibold text-ink">{s3Preview}</span>
                </p>
              )}

              {eqOptions.length > 0 && !isFuture && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-ink-muted">
                    {modality === "run" ? "Shoes" : "Bike"}
                    <select
                      value={equipmentId}
                      onChange={(e) => setEquipmentId(e.target.value)}
                      className="mt-1 block w-full rounded border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent"
                    >
                      <option value="">— none —</option>
                      {eqOptions.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>

            {/* Description + Private Notes */}
            <div>
              <label className="text-xs font-medium text-ink-muted">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
              />
              <label className="mt-3 block text-xs font-medium text-ink-muted">
                Private Notes
              </label>
              <textarea
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                rows={3}
                placeholder="Only you can see this."
                className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
              />
              {isFuture && (
                <p className="mt-2 text-xs text-ink-muted">
                  Future date — planned values only.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-6 py-3">
          <div className="flex items-center gap-3">
            {editing && (
              <button
                onClick={remove}
                disabled={pending}
                className="text-sm text-ink-muted hover:text-fatigue disabled:opacity-50"
              >
                Delete
              </button>
            )}
            {initial?.hasStreams && initial.activityId && (
              <Link href={`/activity/${initial.activityId}`} className="text-sm font-medium text-accent">
                Analyze
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onClose} disabled={pending} className="text-sm text-ink-muted hover:text-ink">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={pending}
              className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              Save &amp; Close
            </button>
          </div>
        </div>
      </div>

      {filesOpen && initial?.activityId && (
        <FilesModal activityId={initial.activityId} onClose={() => setFilesOpen(false)} />
      )}
    </div>
  );
}

function FieldRow({
  row,
  planned,
  setPlanned,
  completed,
  setCompleted,
  isFuture,
  inputCls,
  disabledCls,
}: {
  row: { key: string; label: string; unit: string; plannedEditable: boolean };
  units: Units;
  modality: Modality;
  planned: StrMap;
  setPlanned: (f: (m: StrMap) => StrMap) => void;
  completed: StrMap;
  setCompleted: (f: (m: StrMap) => StrMap) => void;
  isFuture: boolean;
  inputCls: string;
  disabledCls: string;
}) {
  return (
    <>
      <label className="text-right text-xs text-ink">{row.label}</label>
      {row.plannedEditable ? (
        <input
          value={planned[row.key] ?? ""}
          onChange={(e) => setPlanned((m) => ({ ...m, [row.key]: e.target.value }))}
          className={inputCls}
        />
      ) : (
        <span className={`${disabledCls} block`} aria-hidden />
      )}
      {isFuture ? (
        <span className={`${disabledCls} block`} aria-hidden />
      ) : (
        <input
          value={completed[row.key] ?? ""}
          onChange={(e) => setCompleted((m) => ({ ...m, [row.key]: e.target.value }))}
          className={inputCls}
        />
      )}
      <span className="text-[10px] text-ink-muted">{row.unit}</span>
    </>
  );
}
