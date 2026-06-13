"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Modality, Units } from "@/lib/db/types";
import { MODALITY_LABEL } from "@/lib/util/format";
import SportIcon from "@/components/SportIcon";
import {
  estimateWorkout,
  profileSegments,
  type EstimateThresholds,
  type ProfileSegment,
} from "@/lib/workout/estimate";
import { summarizeWorkout } from "@/lib/workout/summary";
import {
  isRepeat,
  validateWorkout,
  type RepeatBlock,
  type SimpleStep,
  type StepIntensity,
  type StepTarget,
  type TargetKind,
  type WorkoutDoc,
  type WorkoutStep,
} from "@/lib/workout/template";
import {
  defaultDistanceUnit,
  distanceUnitMeters,
  fmtDuration,
  numOrNull,
  parseDuration,
  paceToSpeed,
  paceUnitLabel,
  speedToPace,
  type DistanceUnit,
} from "@/lib/workout/units";
import { formatDuration, formatDistance } from "@/lib/util/format";
import { saveTemplate, scheduleTemplate } from "@/app/actions/workoutTemplate";

// ---- helpers ----------------------------------------------------------------

let _seq = 0;
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `s${Date.now()}_${_seq++}`;

const MODALITIES: Modality[] = ["run", "bike", "swim", "row", "lift", "core"];

const INTENSITY_LABEL: Record<StepIntensity, string> = {
  warmup: "Warm up",
  active: "Active",
  interval: "Interval",
  recovery: "Recovery",
  rest: "Rest",
  cooldown: "Cool down",
};

// Profile-bar color by intensity — light for easy, accent for work, hot for hard.
const INTENSITY_COLOR: Record<StepIntensity, string> = {
  warmup: "#93c5fd",
  cooldown: "#93c5fd",
  recovery: "#cbd5e1",
  rest: "#cbd5e1",
  active: "#2f6fed",
  interval: "#fd6b00",
};

function defaultTargetKind(m: Modality): TargetKind {
  if (m === "bike") return "power";
  if (m === "run" || m === "swim") return "pace";
  return "none";
}

function defaultStep(intensity: StepIntensity, m: Modality): SimpleStep {
  const isWork = intensity === "active" || intensity === "interval";
  return {
    kind: "step",
    id: uid(),
    intensity,
    durationKind: "time",
    durationValue: intensity === "warmup" || intensity === "cooldown" ? 600 : isWork ? 300 : 120,
    target: { kind: isWork ? defaultTargetKind(m) : "none" },
  };
}

function defaultRepeat(m: Modality): RepeatBlock {
  return {
    kind: "repeat",
    id: uid(),
    count: 4,
    steps: [
      { kind: "step", id: uid(), intensity: "interval", durationKind: "distance", durationValue: 400, target: { kind: defaultTargetKind(m) } },
      { kind: "step", id: uid(), intensity: "recovery", durationKind: "time", durationValue: 90, target: { kind: "none" } },
    ],
  };
}

// ---- main editor ------------------------------------------------------------

export interface EditorInitial {
  id: number | null;
  name: string;
  modality: Modality;
  description: string;
  steps: WorkoutStep[];
}

export default function WorkoutEditor({
  initial,
  units,
  thresholds,
}: {
  initial: EditorInitial;
  units: Units;
  thresholds: Record<Modality, EstimateThresholds>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [id, setId] = useState<number | null>(initial.id);
  const [name, setName] = useState(initial.name);
  const [modality, setModality] = useState<Modality>(initial.modality);
  const [description, setDescription] = useState(initial.description);
  const [steps, setSteps] = useState<WorkoutStep[]>(initial.steps);
  const [scheduleDate, setScheduleDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const doc: WorkoutDoc = { name, modality, description, steps };
  const th = thresholds[modality] ?? {};
  const est = useMemo(() => estimateWorkout(doc, th), [name, modality, steps]); // eslint-disable-line react-hooks/exhaustive-deps
  const segs = useMemo(() => profileSegments(doc, th), [modality, steps]); // eslint-disable-line react-hooks/exhaustive-deps
  const outline = useMemo(() => summarizeWorkout(steps, units, modality), [steps, units, modality]);

  // ---- step mutations ----
  const replaceTop = (i: number, s: WorkoutStep) =>
    setSteps((prev) => prev.map((p, j) => (j === i ? s : p)));
  const removeTop = (i: number) => setSteps((prev) => prev.filter((_, j) => j !== i));
  const moveTop = (i: number, dir: -1 | 1) =>
    setSteps((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const addStep = (intensity: StepIntensity) =>
    setSteps((prev) => [...prev, defaultStep(intensity, modality)]);
  const addRepeat = () => setSteps((prev) => [...prev, defaultRepeat(modality)]);

  function persist(): Promise<number | null> {
    return saveTemplate({ id, name, modality, description, steps }).then((r) => {
      if (!r.ok) {
        setError(r.errors[0] ?? "Could not save");
        return null;
      }
      setError(null);
      if (r.id && r.id !== id) setId(r.id);
      return r.id;
    });
  }

  function save(close: boolean) {
    const v = validateWorkout(doc);
    if (!v.ok) {
      setError(v.errors[0]);
      return;
    }
    start(async () => {
      const savedId = await persist();
      if (savedId && close) router.push("/workout-library");
      else router.refresh();
    });
  }

  function exportFit() {
    const v = validateWorkout(doc);
    if (!v.ok) {
      setError(v.errors[0]);
      return;
    }
    start(async () => {
      const savedId = await persist();
      if (savedId) window.location.href = `/api/workout/fit?template=${savedId}`;
    });
  }

  function schedule() {
    if (!scheduleDate) return;
    const v = validateWorkout(doc);
    if (!v.ok) {
      setError(v.errors[0]);
      return;
    }
    start(async () => {
      const savedId = await persist();
      if (savedId) {
        await scheduleTemplate(savedId, scheduleDate);
        router.push("/calendar");
      }
    });
  }

  const inputCls =
    "rounded border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent";

  return (
    <div className="mx-auto max-w-[1100px]">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[280px] flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Workout"
            className="w-full rounded border border-line px-3 py-2 text-lg font-medium text-ink outline-none focus:border-accent"
          />
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <SportIcon modality={modality} size={18} />
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value as Modality)}
                className={inputCls}
                aria-label="Sport"
              >
                {MODALITIES.map((m) => (
                  <option key={m} value={m}>
                    {MODALITY_LABEL[m]}
                  </option>
                ))}
              </select>
            </span>
            <Stat label="Time" value={est.durationS != null ? formatDuration(est.durationS) : "—"} />
            <Stat
              label="Distance"
              value={est.distanceM != null ? formatDistance(est.distanceM, units) : "—"}
            />
            <Stat label="TSS" value={est.tss != null ? String(est.tss) : "—"} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={id ? `/api/workout/fit?template=${id}` : undefined}
            onClick={(e) => {
              e.preventDefault();
              exportFit();
            }}
            className="cursor-pointer rounded border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-accent hover:text-accent"
          >
            Export .FIT
          </a>
          <button
            onClick={() => save(false)}
            disabled={pending}
            className="rounded border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-accent disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => save(true)}
            disabled={pending}
            className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Save &amp; Close
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded border border-fatigue/40 bg-fatigue/10 px-3 py-2 text-sm text-fatigue">
          {error}
        </div>
      )}

      {/* Intensity profile */}
      <IntensityProfile segments={segs} />

      {/* Block palette */}
      <div className="mb-3 mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-ink-muted">Add block:</span>
        {(["warmup", "active", "interval", "recovery", "cooldown"] as StepIntensity[]).map((it) => (
          <button
            key={it}
            onClick={() => addStep(it)}
            className="rounded border border-line px-2.5 py-1 text-xs font-medium text-ink hover:border-accent hover:text-accent"
          >
            + {INTENSITY_LABEL[it]}
          </button>
        ))}
        <button
          onClick={addRepeat}
          className="rounded border border-line px-2.5 py-1 text-xs font-medium text-ink hover:border-accent hover:text-accent"
        >
          + Repeat
        </button>
      </div>

      {/* Step list */}
      <div className="space-y-2">
        {steps.length === 0 && (
          <div className="rounded border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
            Click the blocks above to begin building your workout.
          </div>
        )}
        {steps.map((s, i) =>
          isRepeat(s) ? (
            <RepeatRow
              key={s.id}
              block={s}
              modality={modality}
              units={units}
              onChange={(b) => replaceTop(i, b)}
              onRemove={() => removeTop(i)}
              onMoveUp={() => moveTop(i, -1)}
              onMoveDown={() => moveTop(i, 1)}
              canUp={i > 0}
              canDown={i < steps.length - 1}
            />
          ) : (
            <StepRow
              key={s.id}
              step={s}
              modality={modality}
              units={units}
              onChange={(st) => replaceTop(i, st)}
              onRemove={() => removeTop(i)}
              onMoveUp={() => moveTop(i, -1)}
              onMoveDown={() => moveTop(i, 1)}
              canUp={i > 0}
              canDown={i < steps.length - 1}
            />
          ),
        )}
      </div>

      {/* Outline + schedule */}
      {steps.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px]">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Workout Details</h3>
            <p className="mt-1 text-sm text-ink">{outline}</p>
            <label className="mt-3 block text-xs font-medium text-ink-muted">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional — defaults to the workout outline."
                className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
          </div>
          <div className="rounded border border-line bg-surface p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Schedule to calendar</h3>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className={inputCls}
              />
              <button
                onClick={schedule}
                disabled={pending || !scheduleDate}
                className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                Schedule
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-muted">
              Adds a planned workout on that date with this structure. Export the .FIT to load it
              onto a Garmin.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-base font-semibold tabular-nums text-ink">{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</span>
    </span>
  );
}

// ---- intensity profile graph ------------------------------------------------

function IntensityProfile({ segments }: { segments: ProfileSegment[] }) {
  const totalW = segments.reduce((a, s) => a + s.seconds, 0) || 1;
  return (
    <div className="flex h-28 items-end gap-px rounded border border-line bg-surface px-2 pb-0 pt-2">
      {segments.length === 0 ? (
        <div className="m-auto text-xs text-ink-muted">The workout profile appears here as you add steps.</div>
      ) : (
        segments.map((s, i) => {
          const widthPct = Math.max(1.2, (s.seconds / totalW) * 100);
          const heightPct = Math.max(12, Math.min(100, (s.frac / 1.3) * 100));
          return (
            <div
              key={i}
              title={`${INTENSITY_LABEL[s.intensity]} · ${Math.round(s.frac * 100)}%`}
              style={{
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                backgroundColor: INTENSITY_COLOR[s.intensity],
              }}
              className="rounded-t-sm"
            />
          );
        })
      )}
    </div>
  );
}

// ---- repeat block -----------------------------------------------------------

function RepeatRow({
  block,
  modality,
  units,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canUp,
  canDown,
}: {
  block: RepeatBlock;
  modality: Modality;
  units: Units;
  onChange: (b: RepeatBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const setInner = (i: number, s: SimpleStep) =>
    onChange({ ...block, steps: block.steps.map((p, j) => (j === i ? s : p)) });
  const removeInner = (i: number) =>
    onChange({ ...block, steps: block.steps.filter((_, j) => j !== i) });
  const moveInner = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= block.steps.length) return;
    const next = [...block.steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...block, steps: next });
  };
  const addInner = () =>
    onChange({
      ...block,
      steps: [
        ...block.steps,
        { kind: "step", id: uid(), intensity: "interval", durationKind: "time", durationValue: 60, target: { kind: "none" } },
      ],
    });

  return (
    <div className="rounded border border-accent/40 bg-accent/5 p-2">
      <div className="mb-2 flex items-center gap-2">
        <Grip />
        <span className="text-sm font-semibold text-ink">Repeat</span>
        <input
          type="number"
          min={2}
          max={99}
          value={block.count}
          onChange={(e) => onChange({ ...block, count: Math.max(2, Math.min(99, Number(e.target.value) || 2)) })}
          className="w-16 rounded border border-line px-2 py-1 text-sm tabular-nums text-ink outline-none focus:border-accent"
          aria-label="Repeat count"
        />
        <span className="text-sm text-ink-muted">times</span>
        <span className="ml-auto flex items-center gap-1">
          <MoveBtns onUp={onMoveUp} onDown={onMoveDown} canUp={canUp} canDown={canDown} />
          <RemoveBtn onClick={onRemove} />
        </span>
      </div>
      <div className="space-y-2 pl-4">
        {block.steps.map((s, i) => (
          <StepRow
            key={s.id}
            step={s}
            modality={modality}
            units={units}
            onChange={(st) => setInner(i, st)}
            onRemove={() => removeInner(i)}
            onMoveUp={() => moveInner(i, -1)}
            onMoveDown={() => moveInner(i, 1)}
            canUp={i > 0}
            canDown={i < block.steps.length - 1}
          />
        ))}
        <button
          onClick={addInner}
          className="rounded border border-line px-2 py-1 text-xs font-medium text-ink hover:border-accent hover:text-accent"
        >
          + Add step
        </button>
      </div>
    </div>
  );
}

// ---- single step ------------------------------------------------------------

function StepRow({
  step,
  modality,
  units,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canUp,
  canDown,
}: {
  step: SimpleStep;
  modality: Modality;
  units: Units;
  onChange: (s: SimpleStep) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  // Local display strings, seeded once from the SI step (keyed by id upstream).
  const [durStr, setDurStr] = useState(() =>
    step.durationKind === "time" ? fmtDuration(step.durationValue) : "",
  );
  const [distUnit, setDistUnit] = useState<DistanceUnit>(() => {
    const m = step.durationValue ?? 0;
    if (step.durationKind === "distance" && m > 0 && m < 1000) return "m";
    return defaultDistanceUnit(units, modality);
  });
  const [distStr, setDistStr] = useState(() =>
    step.durationKind === "distance" && step.durationValue != null
      ? String(+(step.durationValue / distanceUnitMeters(distUnitInit(step, units, modality))).toFixed(2))
      : "",
  );

  function emit(patch: Partial<SimpleStep>) {
    onChange({ ...step, ...patch });
  }

  function setDurationKind(kind: SimpleStep["durationKind"]) {
    if (kind === "time") emit({ durationKind: "time", durationValue: parseDuration(durStr) ?? 300 });
    else if (kind === "distance")
      emit({ durationKind: "distance", durationValue: distToM(distStr, distUnit) ?? 400 });
    else emit({ durationKind: "lapButton", durationValue: null });
  }

  const accent = INTENSITY_COLOR[step.intensity];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-line bg-surface-card p-2">
      <span className="h-8 w-1 rounded" style={{ backgroundColor: accent }} aria-hidden />
      <Grip />
      <select
        value={step.intensity}
        onChange={(e) => emit({ intensity: e.target.value as StepIntensity })}
        className="rounded border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent"
        aria-label="Intensity"
      >
        {(Object.keys(INTENSITY_LABEL) as StepIntensity[]).map((it) => (
          <option key={it} value={it}>
            {INTENSITY_LABEL[it]}
          </option>
        ))}
      </select>

      {/* Duration */}
      <select
        value={step.durationKind}
        onChange={(e) => setDurationKind(e.target.value as SimpleStep["durationKind"])}
        className="rounded border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent"
        aria-label="Duration type"
      >
        <option value="time">Time</option>
        <option value="distance">Distance</option>
        <option value="lapButton">Lap button</option>
      </select>
      {step.durationKind === "time" && (
        <input
          value={durStr}
          onChange={(e) => {
            setDurStr(e.target.value);
            emit({ durationValue: parseDuration(e.target.value) });
          }}
          placeholder="5:00"
          className="w-20 rounded border border-line px-2 py-1 text-sm tabular-nums text-ink outline-none focus:border-accent"
          aria-label="Time"
        />
      )}
      {step.durationKind === "distance" && (
        <span className="flex items-center gap-1">
          <input
            value={distStr}
            onChange={(e) => {
              setDistStr(e.target.value);
              emit({ durationValue: distToM(e.target.value, distUnit) });
            }}
            placeholder="400"
            className="w-20 rounded border border-line px-2 py-1 text-sm tabular-nums text-ink outline-none focus:border-accent"
            aria-label="Distance"
          />
          <select
            value={distUnit}
            onChange={(e) => {
              const u = e.target.value as DistanceUnit;
              setDistUnit(u);
              emit({ durationValue: distToM(distStr, u) });
            }}
            className="rounded border border-line px-1 py-1 text-sm text-ink outline-none focus:border-accent"
            aria-label="Distance unit"
          >
            {(["m", "km", "mi", "yd"] as DistanceUnit[]).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </span>
      )}
      {step.durationKind === "lapButton" && (
        <span className="text-xs text-ink-muted">until lap press</span>
      )}

      {/* Target */}
      <TargetFields
        target={step.target}
        modality={modality}
        units={units}
        onChange={(t) => emit({ target: t })}
      />

      <span className="ml-auto flex items-center gap-1">
        <MoveBtns onUp={onMoveUp} onDown={onMoveDown} canUp={canUp} canDown={canDown} />
        <RemoveBtn onClick={onRemove} />
      </span>
    </div>
  );
}

// ---- target editor ----------------------------------------------------------

const TARGET_OPTIONS: { value: TargetKind; label: string }[] = [
  { value: "none", label: "No target" },
  { value: "pace", label: "Pace" },
  { value: "hr", label: "Heart rate" },
  { value: "power", label: "Power" },
  { value: "cadence", label: "Cadence" },
  { value: "hrZone", label: "HR zone" },
  { value: "powerZone", label: "Power zone" },
];

function TargetFields({
  target,
  modality,
  units,
  onChange,
}: {
  target: StepTarget;
  modality: Modality;
  units: Units;
  onChange: (t: StepTarget) => void;
}) {
  const isPace = target.kind === "pace";
  const isZone = target.kind === "hrZone" || target.kind === "powerZone";

  // Seed text from SI; keyed indirectly by parent step remount.
  const [fromStr, setFromStr] = useState(() => seedLow(target, modality, units));
  const [toStr, setToStr] = useState(() => seedHigh(target, modality, units));

  function commit(kind: TargetKind, f: string, t: string) {
    if (kind === "none") return onChange({ kind: "none" });
    if (kind === "hrZone" || kind === "powerZone")
      return onChange({ kind, low: numOrNull(f) ?? 1 });
    if (kind === "pace") {
      // From = slower pace (lower speed), To = faster pace (higher speed).
      const low = paceToSpeed(f, modality, units);
      const high = paceToSpeed(t, modality, units);
      return onChange({ kind, low, high });
    }
    onChange({ kind, low: numOrNull(f), high: numOrNull(t) });
  }

  function changeKind(kind: TargetKind) {
    setFromStr("");
    setToStr("");
    if (kind === "hrZone" || kind === "powerZone") onChange({ kind, low: 2 });
    else if (kind === "none") onChange({ kind: "none" });
    else onChange({ kind, low: null, high: null });
  }

  const sel = "rounded border border-line px-2 py-1 text-sm text-ink outline-none focus:border-accent";
  const inp = "w-16 rounded border border-line px-2 py-1 text-sm tabular-nums text-ink outline-none focus:border-accent";

  return (
    <span className="flex items-center gap-1">
      <select value={target.kind} onChange={(e) => changeKind(e.target.value as TargetKind)} className={sel} aria-label="Target">
        {TARGET_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {target.kind !== "none" && !isZone && (
        <>
          <input
            value={fromStr}
            onChange={(e) => {
              setFromStr(e.target.value);
              commit(target.kind, e.target.value, toStr);
            }}
            placeholder={isPace ? "5:30" : "from"}
            className={inp}
            aria-label="Target from"
          />
          <span className="text-xs text-ink-muted">–</span>
          <input
            value={toStr}
            onChange={(e) => {
              setToStr(e.target.value);
              commit(target.kind, fromStr, e.target.value);
            }}
            placeholder={isPace ? "5:00" : "to"}
            className={inp}
            aria-label="Target to"
          />
          <span className="text-[11px] text-ink-muted">{targetUnit(target.kind, modality, units)}</span>
        </>
      )}

      {isZone && (
        <select
          value={target.low ?? 2}
          onChange={(e) => onChange({ kind: target.kind, low: Number(e.target.value) })}
          className={sel}
          aria-label="Zone"
        >
          {Array.from({ length: target.kind === "powerZone" ? 7 : 5 }, (_, i) => i + 1).map((z) => (
            <option key={z} value={z}>
              Zone {z}
            </option>
          ))}
        </select>
      )}
    </span>
  );
}

// ---- small controls ---------------------------------------------------------

function Grip() {
  return (
    <span className="cursor-grab text-ink-muted/60" aria-hidden title="Drag to reorder">
      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
        <circle cx="2" cy="3" r="1.4" /><circle cx="8" cy="3" r="1.4" />
        <circle cx="2" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" />
        <circle cx="2" cy="13" r="1.4" /><circle cx="8" cy="13" r="1.4" />
      </svg>
    </span>
  );
}

function MoveBtns({ onUp, onDown, canUp, canDown }: { onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean }) {
  const cls = "rounded px-1 text-ink-muted hover:text-accent disabled:opacity-30";
  return (
    <>
      <button onClick={onUp} disabled={!canUp} className={cls} aria-label="Move up" title="Move up">▲</button>
      <button onClick={onDown} disabled={!canDown} className={cls} aria-label="Move down" title="Move down">▼</button>
    </>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded px-1.5 text-ink-muted hover:text-fatigue" aria-label="Remove" title="Remove">
      ×
    </button>
  );
}

// ---- conversion helpers (module-local) --------------------------------------

function distToM(s: string, u: DistanceUnit): number | null {
  const n = numOrNull(s);
  return n == null ? null : Math.round(n * distanceUnitMeters(u));
}

function distUnitInit(step: SimpleStep, units: Units, modality: Modality): DistanceUnit {
  const m = step.durationValue ?? 0;
  if (m > 0 && m < 1000) return "m";
  return defaultDistanceUnit(units, modality);
}

function seedLow(t: StepTarget, modality: Modality, units: Units): string {
  if (t.kind === "pace") return t.low != null ? speedToPace(t.low, modality, units) : "";
  if (t.kind === "hr" || t.kind === "power" || t.kind === "cadence")
    return t.low != null ? String(Math.round(t.low)) : "";
  return "";
}

function seedHigh(t: StepTarget, modality: Modality, units: Units): string {
  if (t.kind === "pace") return t.high != null ? speedToPace(t.high, modality, units) : "";
  if (t.kind === "hr" || t.kind === "power" || t.kind === "cadence")
    return t.high != null ? String(Math.round(t.high)) : "";
  return "";
}

function targetUnit(kind: TargetKind, modality: Modality, units: Units): string {
  switch (kind) {
    case "pace":
      return paceUnitLabel(modality, units);
    case "hr":
      return "bpm";
    case "power":
      return "W";
    case "cadence":
      return modality === "swim" ? "spm" : "rpm";
    default:
      return "";
  }
}
