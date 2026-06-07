"use client";

import { useState } from "react";
import type { ZoneMethod, ZoneRow } from "@/lib/zones/methods";
import { ADD_ACTIVITY_OPTIONS } from "@/lib/zones/methods";

interface ThresholdField {
  key: string;
  label: string;
  value: number | "";
  unit: string;
}

const inputCls =
  "rounded border border-line px-2 py-1.5 text-sm outline-none focus:border-accent";
const link = "text-sm font-medium text-accent hover:underline";

export default function ZoneEditor({
  title,
  defaultLabel,
  thresholds: initialThresholds,
  types,
  methodsByType,
  initialZones,
  showAddActivity = false,
}: {
  title: string;
  defaultLabel: string;
  thresholds: ThresholdField[];
  types: readonly string[];
  methodsByType: Record<string, ZoneMethod[]>;
  initialZones: ZoneRow[];
  showAddActivity?: boolean;
}) {
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [type, setType] = useState(types[0]);
  const [method, setMethod] = useState("");
  const [zones, setZones] = useState<ZoneRow[]>(initialZones);

  const setThreshold = (key: string, v: string) =>
    setThresholds((t) =>
      t.map((f) => (f.key === key ? { ...f, value: v === "" ? "" : Number(v) } : f)),
    );
  const setZone = (i: number, patch: Partial<ZoneRow>) =>
    setZones((z) => z.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const removeZone = (i: number) => setZones((z) => z.filter((_, idx) => idx !== i));
  const addZone = () =>
    setZones((z) => [...z, { name: `Zone ${z.length + 1}`, low: "", high: "" }]);

  const methods = methodsByType[type] ?? [];

  return (
    <section className="mb-8">
      <h2 className="border-b border-line pb-1 text-lg text-ink">{title}</h2>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm font-bold text-ink">{defaultLabel}</span>
        <a className={`${link} flex items-center gap-1`} href="#">
          View History <span aria-hidden>↗</span>
        </a>
      </div>

      {/* Threshold Values */}
      <fieldset className="mt-3 rounded border border-line p-3">
        <legend className="px-1 text-xs italic text-ink-muted">
          Threshold Values
        </legend>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {thresholds.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm text-ink">
              {f.label}
              <input
                value={f.value}
                onChange={(e) => setThreshold(f.key, e.target.value)}
                className={`${inputCls} w-20`}
              />
              <span className="text-ink-muted">{f.unit}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Auto Calculation */}
      <fieldset className="mt-3 rounded border border-line p-3">
        <legend className="px-1 text-xs italic text-ink-muted">
          Auto Calculation
        </legend>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setMethod("");
            }}
            className={`${inputCls} w-48`}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={`${inputCls} w-56`}
          >
            <option value="">Choose Method</option>
            {methods.map((mm) => (
              <option key={mm.id} value={mm.id}>
                {mm.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!method}
            title={method ? "Calculate zones" : "Choose a method first"}
            className="rounded bg-line px-3 py-1.5 text-sm font-medium text-ink-muted disabled:opacity-60"
          >
            Calculate
          </button>
        </div>
      </fieldset>

      {/* Zone rows */}
      <div className="mt-3 space-y-2">
        {zones.map((z, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={z.name}
              onChange={(e) => setZone(i, { name: e.target.value })}
              className={`${inputCls} flex-1`}
            />
            <input
              value={z.low}
              onChange={(e) => setZone(i, { low: e.target.value === "" ? "" : Number(e.target.value) })}
              className={`${inputCls} w-20 text-center`}
            />
            <span className="text-sm text-ink-muted">to</span>
            <input
              value={z.high}
              onChange={(e) => setZone(i, { high: e.target.value === "" ? "" : Number(e.target.value) })}
              className={`${inputCls} w-20 text-center`}
            />
            <button onClick={() => removeZone(i)} className={`${link} w-16 text-left`}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <button onClick={addZone} className={`${link} mt-3 block`}>
        Add Zone
      </button>

      {showAddActivity && (
        <div className="mt-4">
          <p className="mb-1 text-sm font-bold text-ink">Add Activity</p>
          <div className="flex items-center gap-3">
            <select className={`${inputCls} w-40`}>
              {ADD_ACTIVITY_OPTIONS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <a href="#" className={link}>
              Add
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
