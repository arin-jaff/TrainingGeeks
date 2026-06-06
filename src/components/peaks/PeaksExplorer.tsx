"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EChartsOption } from "echarts";
import EChart from "@/components/charts/EChart";
import type { PaceEffortRow } from "@/lib/db/repo";
import type { Modality, Units } from "@/lib/db/types";
import { formatDuration, formatPace, MODALITY_LABEL } from "@/lib/util/format";

const CARDIO: Modality[] = ["run", "bike", "swim"];

function distanceLabel(m: number): string {
  if (Math.abs(m - 1609.34) < 1) return "1 mi";
  if (Math.abs(m - 16093.4) < 5) return "10 mi";
  if (Math.abs(m - 21097.5) < 5) return "Half Marathon";
  if (m >= 1000) return `${m / 1000} km`;
  return `${m} m`;
}

const paceSecPerMi = (speed: number) => 1609.34 / speed;
const fmtMMSS = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

function Select<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        const match = options.find((o) => String(o.value) === raw);
        if (match) onChange(match.value);
      }}
      className="rounded border-b border-line bg-transparent px-1 py-1 text-sm text-ink outline-none focus:border-accent"
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function PeaksExplorer({
  efforts,
  units,
}: {
  efforts: PaceEffortRow[];
  units: Units;
}) {
  const modalities = useMemo(() => {
    const present = CARDIO.filter((m) =>
      efforts.some((e) => e.modality === m),
    );
    return present.length ? present : (["run"] as Modality[]);
  }, [efforts]);

  const [modality, setModality] = useState<Modality>(modalities[0]);

  const windows = useMemo(() => {
    const ws = [
      ...new Set(
        efforts.filter((e) => e.modality === modality).map((e) => e.window),
      ),
    ].sort((a, b) => a - b);
    return ws;
  }, [efforts, modality]);

  const [windowM, setWindowM] = useState<number>(windows[0] ?? 400);
  const activeWindow = windows.includes(windowM) ? windowM : (windows[0] ?? 400);

  const years = useMemo(() => {
    const ys = [
      ...new Set(efforts.map((e) => Number(e.date.slice(0, 4)))),
    ].sort((a, b) => b - a);
    return ys;
  }, [efforts]);
  const [year, setYear] = useState<number | "all">("all");

  const rows = useMemo(() => {
    return efforts
      .filter(
        (e) =>
          e.modality === modality &&
          e.window === activeWindow &&
          (year === "all" || Number(e.date.slice(0, 4)) === year),
      )
      .sort((a, b) => b.speed - a.speed);
  }, [efforts, modality, activeWindow, year]);

  const byDate = useMemo(
    () => [...rows].sort((a, b) => a.date.localeCompare(b.date)),
    [rows],
  );

  const chart: EChartsOption = {
    grid: { left: 56, right: 16, top: 16, bottom: 28 },
    tooltip: {
      trigger: "axis",
      formatter: (p: unknown) => {
        const arr = p as { axisValue: string; data: number }[];
        return `${arr[0].axisValue}: ${fmtMMSS(arr[0].data)} /mi`;
      },
    },
    xAxis: {
      type: "category",
      data: byDate.map((e) => e.date.slice(5)),
      axisLabel: { fontSize: 10, color: "#6b7280" },
    },
    yAxis: {
      type: "value",
      inverse: true, // faster pace at the top
      axisLabel: {
        fontSize: 10,
        color: "#6b7280",
        formatter: (v: number) => fmtMMSS(v),
      },
    },
    series: [
      {
        type: "line",
        smooth: false,
        symbolSize: 7,
        data: byDate.map((e) => Math.round(paceSecPerMi(e.speed))),
        lineStyle: { color: "#2f6fed", width: 2 },
        itemStyle: { color: "#2f6fed" },
      },
    ],
  };

  return (
    <div className="rounded border border-line bg-surface-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Peak Performances</h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <Select
          value={modality}
          options={modalities.map((m) => ({ value: m, label: MODALITY_LABEL[m] }))}
          onChange={setModality}
        />
        <Select
          value={activeWindow}
          options={windows.map((w) => ({ value: w, label: distanceLabel(w) }))}
          onChange={setWindowM}
        />
        <Select
          value={year}
          options={[
            { value: "all" as const, label: "All years" },
            ...years.map((y) => ({ value: y, label: String(y) })),
          ]}
          onChange={(v) => setYear(v as number | "all")}
        />
      </div>

      {byDate.length > 1 ? (
        <EChart option={chart} height={260} />
      ) : (
        <p className="py-8 text-center text-sm text-ink-muted">
          Not enough efforts to chart yet.
        </p>
      )}

      <ol className="mt-4 divide-y divide-line">
        {rows.length === 0 && (
          <li className="py-3 text-sm text-ink-muted">No efforts found.</li>
        )}
        {rows.slice(0, 10).map((e, i) => (
          <li
            key={`${e.activity_id}-${e.window}`}
            className={`flex items-center gap-4 px-1 py-2 text-sm ${
              i === 0 ? "bg-accent/5" : ""
            }`}
          >
            <span className="w-5 text-center text-ink-muted">{i + 1}</span>
            <span className="w-20 font-semibold tabular-nums text-ink">
              {formatDuration(e.window / e.speed)}
            </span>
            <span className="w-24 text-ink-muted">
              {formatPace(e.speed, units, modality)}
            </span>
            <span className="text-ink-muted">{MODALITY_LABEL[e.modality as Modality]}</span>
            <span className="ml-auto text-ink-muted">{e.date}</span>
            <Link
              href={`/activity/${e.activity_id}`}
              className="text-xs font-medium text-accent"
            >
              View
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
