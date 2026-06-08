"use client";

import type { EChartsOption } from "echarts";
import EChart from "@/components/charts/EChart";
import type {
  MetricSeries,
  PmcPoint,
  SummarySlice,
  Totals,
  WeekBar,
  WeeklyTotals,
  ZoneTime,
} from "@/lib/queries/dashboard";
import { FITNESS_COLOR, MODALITY_COLOR, PMC_COLOR } from "@/lib/util/colors";
import { formatDistance, formatDuration, MODALITY_LABEL } from "@/lib/util/format";
import type { Modality, Units } from "@/lib/db/types";

function hms(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function StatTiles({ totals, units }: { totals: Totals; units: Units }) {
  const tiles: [string, string][] = [
    ["Workouts", String(totals.count)],
    ["Duration", formatDuration(totals.durationS)],
    ["Distance", formatDistance(totals.distanceM, units)],
    ["Load", String(Math.round(totals.tss))],
    [
      "Elevation",
      `${Math.round(totals.elevationM * (units === "imperial" ? 3.28084 : 1))} ${units === "imperial" ? "ft" : "m"}`,
    ],
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded border border-line bg-surface-card px-3 py-2 text-center">
          <div className="text-lg font-semibold tabular-nums text-ink">{value}</div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
        </div>
      ))}
    </div>
  );
}

export function ZoneTimeChart({ data, color }: { data: ZoneTime; color: string }) {
  const option: EChartsOption = {
    grid: { left: 52, right: 12, top: 12, bottom: 48 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v) => hms((v as number) * 60),
    },
    xAxis: {
      type: "category",
      data: data.labels,
      axisLabel: { fontSize: 10, color: "#6b7280", interval: 0, rotate: 30 },
    },
    yAxis: {
      type: "value",
      name: "min",
      axisLabel: { fontSize: 10, color: "#6b7280" },
    },
    series: [
      {
        type: "bar",
        data: data.seconds.map((s) => Math.round(s / 60)),
        itemStyle: { color },
        barMaxWidth: 36,
      },
    ],
  };
  return <EChart option={option} height={260} />;
}

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

export interface InjurySpan {
  start: string; // YYYY-MM-DD
  end: string; // resolved end (today if ongoing)
  ongoing: boolean;
  title: string;
  bodyPart: string | null;
  notes: string | null;
}

export function PmcChart({
  points,
  injuries = [],
}: {
  points: PmcPoint[];
  injuries?: InjurySpan[];
}) {
  const dates = points.map((p) => md(p.date));

  // Map each injury to the band of visible points it overlaps.
  const bands = injuries
    .map((inj) => {
      const lo = points.findIndex((p) => p.date >= inj.start);
      let hi = -1;
      for (let i = points.length - 1; i >= 0; i--) {
        if (points[i].date <= inj.end) { hi = i; break; }
      }
      if (lo === -1 || hi === -1 || lo > hi) return null;
      return { lo, hi, inj };
    })
    .filter((b): b is { lo: number; hi: number; inj: InjurySpan } => b !== null);

  const injuryAt = (idx: number): InjurySpan | undefined => {
    const date = points[idx]?.date;
    return injuries.find((i) => date && date >= i.start && date <= i.end);
  };

  const markArea =
    bands.length > 0
      ? {
          silent: true,
          itemStyle: { color: "rgba(226,87,76,0.14)" },
          data: bands.map(
            (b) =>
              [{ xAxis: dates[b.lo] }, { xAxis: dates[b.hi] }] as [
                { xAxis: string },
                { xAxis: string },
              ],
          ),
        }
      : undefined;

  const option: EChartsOption = {
    grid: { left: 44, right: 48, top: 28, bottom: 28 },
    legend: { top: 0, itemWidth: 14, textStyle: { fontSize: 11 } },
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown) => {
        const arr = params as { dataIndex: number; axisValue: string; marker: string; seriesName: string; value: number }[];
        if (!arr.length) return "";
        let html = `<div style="font-weight:600">${arr[0].axisValue}</div>`;
        for (const p of arr) html += `<div>${p.marker} ${p.seriesName}: ${Math.round(p.value)}</div>`;
        const inj = injuryAt(arr[0].dataIndex);
        if (inj) {
          const range = inj.ongoing
            ? `since ${md(inj.start)}`
            : `${md(inj.start)} – ${md(inj.end)}`;
          html += `<div style="margin-top:5px;color:#e2574c;font-weight:600">Injury: ${inj.title}${inj.bodyPart ? ` · ${inj.bodyPart}` : ""}</div>`;
          html += `<div style="color:#e2574c;font-size:11px">${range}</div>`;
          if (inj.notes) html += `<div style="font-size:11px;color:#6b7280;max-width:220px;white-space:normal">${inj.notes}</div>`;
        }
        return html;
      },
    },
    xAxis: {
      type: "category",
      data: dates,
      axisLabel: { fontSize: 10, color: "#6b7280" },
    },
    yAxis: [
      {
        type: "value",
        name: "TSS/d",
        nameLocation: "middle",
        nameGap: 32,
        nameTextStyle: { color: PMC_COLOR.atl, fontSize: 11 },
        axisLabel: { fontSize: 10, color: "#6b7280" },
      },
      {
        type: "value",
        name: "Form (TSB)",
        nameLocation: "middle",
        nameGap: 36,
        nameRotate: -90,
        nameTextStyle: { color: PMC_COLOR.tsb, fontSize: 11 },
        splitLine: { show: false },
        axisLabel: { fontSize: 10, color: "#6b7280" },
      },
    ],
    series: [
      {
        name: "TSS",
        type: "bar",
        data: points.map((p) => Math.round(p.stress)),
        itemStyle: { color: PMC_COLOR.stress },
        barMaxWidth: 6,
        markArea,
      },
      {
        name: "Fitness",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: points.map((p) => p.ctl),
        lineStyle: { color: PMC_COLOR.ctl, width: 2 },
        itemStyle: { color: PMC_COLOR.ctl },
        areaStyle: { color: PMC_COLOR.ctl, opacity: 0.08 },
      },
      {
        name: "Fatigue",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: points.map((p) => p.atl),
        lineStyle: { color: PMC_COLOR.atl, width: 1.5 },
        itemStyle: { color: PMC_COLOR.atl },
      },
      {
        name: "Form",
        type: "line",
        smooth: true,
        showSymbol: false,
        yAxisIndex: 1,
        data: points.map((p) => p.tsb),
        lineStyle: { color: PMC_COLOR.tsb, width: 1.5 },
        itemStyle: { color: PMC_COLOR.tsb },
      },
    ],
  };
  return <EChart option={option} height={360} />;
}

export function FitnessSummaryPie({ slices }: { slices: SummarySlice[] }) {
  const option: EChartsOption = {
    tooltip: {
      trigger: "item",
      formatter: (p: unknown) => {
        const x = p as { name: string; value: number; percent: number };
        return `${x.name}: ${(x.value / 3600).toFixed(1)} h (${x.percent}%)`;
      },
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        center: ["50%", "52%"],
        label: { fontSize: 11, formatter: "{b}\n{d}%" },
        data: slices.map((s) => ({
          name: MODALITY_LABEL[s.modality],
          value: Math.round(s.durationS),
          itemStyle: { color: MODALITY_COLOR[s.modality] },
        })),
      },
    ],
  };
  return <EChart option={option} height={280} />;
}

export function DurationByWeekChart({ weeks }: { weeks: WeekBar[] }) {
  const present = new Set<Modality>();
  for (const w of weeks)
    for (const k of Object.keys(w.perModality)) present.add(k as Modality);
  const modalities = [...present];
  const option: EChartsOption = {
    grid: { left: 40, right: 16, top: 28, bottom: 28 },
    legend: { top: 0, itemWidth: 14, textStyle: { fontSize: 11 } },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "category",
      data: weeks.map((w) => md(w.weekStart)),
      axisLabel: { fontSize: 10, color: "#6b7280" },
    },
    yAxis: {
      type: "value",
      name: "h",
      axisLabel: { fontSize: 10, color: "#6b7280" },
    },
    series: modalities.map((m) => ({
      name: MODALITY_LABEL[m],
      type: "bar",
      stack: "total",
      data: weeks.map((w) =>
        Number(((w.perModality[m] ?? 0) / 3600).toFixed(2)),
      ),
      itemStyle: { color: MODALITY_COLOR[m] },
    })),
  };
  return <EChart option={option} height={280} />;
}

// ---- Per-week aggregate bars (distance, elevation, kJ, calories, …) -----

const M_PER_MI = 1609.34;

export type WeeklyMetric =
  | "distance"
  | "elevation"
  | "kj"
  | "calories"
  | "cardio"
  | "longestDistance"
  | "longestDuration";

const WEEKLY_CFG: Record<
  WeeklyMetric,
  { label: (u: Units) => string; unit: (u: Units) => string; color: string; dp: number; val: (w: WeeklyTotals, u: Units) => number }
> = {
  distance: { label: () => "Distance by Week", unit: (u) => (u === "imperial" ? "mi" : "km"), color: MODALITY_COLOR.bike, dp: 1, val: (w, u) => w.distanceM / (u === "imperial" ? M_PER_MI : 1000) },
  elevation: { label: () => "Elevation Gain by Week", unit: (u) => (u === "imperial" ? "ft" : "m"), color: "#7b2d8e", dp: 0, val: (w, u) => w.elevationM * (u === "imperial" ? 3.28084 : 1) },
  kj: { label: () => "Kilojoules by Week", unit: () => "kJ", color: "#fd6b00", dp: 0, val: (w) => w.kj },
  calories: { label: () => "Calories by Week", unit: () => "kcal", color: "#e63788", dp: 0, val: (w) => w.calories },
  cardio: { label: () => "Cardio Hours by Week", unit: () => "h", color: MODALITY_COLOR.run, dp: 1, val: (w) => w.cardioS / 3600 },
  longestDistance: { label: () => "Longest Workout by Week", unit: (u) => (u === "imperial" ? "mi" : "km"), color: MODALITY_COLOR.swim, dp: 1, val: (w, u) => w.longestDistanceM / (u === "imperial" ? M_PER_MI : 1000) },
  longestDuration: { label: () => "Longest Workout by Week", unit: () => "h", color: MODALITY_COLOR.lift, dp: 1, val: (w) => w.longestDurationS / 3600 },
};

export function weeklyTitle(metric: WeeklyMetric, units: Units): string {
  return `${WEEKLY_CFG[metric].label(units)} · ${WEEKLY_CFG[metric].unit(units)}`;
}

export function WeeklyBarChart({
  weeks,
  metric,
  units,
}: {
  weeks: WeeklyTotals[];
  metric: WeeklyMetric;
  units: Units;
}) {
  const cfg = WEEKLY_CFG[metric];
  const option: EChartsOption = {
    grid: { left: 44, right: 16, top: 16, bottom: 28 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "category", data: weeks.map((w) => md(w.weekStart)), axisLabel: { fontSize: 10, color: "#6b7280" } },
    yAxis: { type: "value", name: cfg.unit(units), axisLabel: { fontSize: 10, color: "#6b7280" } },
    series: [
      {
        type: "bar",
        data: weeks.map((w) => Number(cfg.val(w, units).toFixed(cfg.dp))),
        itemStyle: { color: cfg.color },
        barMaxWidth: 28,
      },
    ],
  };
  return <EChart option={option} height={280} />;
}

// ---- Mean-maximal peak curves (power / HR / pace) -----------------------

function durLabel(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(sec % 3600 ? 1 : 0)}h`;
}
function distLabel(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(m % 1000 ? 1 : 0)}k`;
}
const paceSec = (speed: number, units: Units, swim = false) =>
  (swim ? 100 : units === "imperial" ? M_PER_MI : 1000) / speed;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function PeakCurveChart({
  points,
  kind,
  units,
  byDistance = false,
}: {
  points: { window: number; value: number }[];
  kind: "power" | "hr" | "pace";
  units: Units;
  byDistance?: boolean;
}) {
  const x = points.map((p) => (byDistance ? distLabel(p.window) : durLabel(p.window)));
  const isPace = kind === "pace";
  const yData = points.map((p) => (isPace ? Math.round(paceSec(p.value, units)) : Math.round(p.value)));
  const color = kind === "power" ? "#fd6b00" : kind === "hr" ? "#e63788" : MODALITY_COLOR.run;
  const unit = kind === "power" ? "W" : kind === "hr" ? "bpm" : units === "imperial" ? "/mi" : "/km";
  const option: EChartsOption = {
    grid: { left: 52, right: 16, top: 16, bottom: 28 },
    tooltip: {
      trigger: "axis",
      formatter: (p: unknown) => {
        const arr = p as { axisValue: string; data: number }[];
        const v = arr[0].data;
        return `${arr[0].axisValue}: ${isPace ? `${mmss(v)} ${unit}` : `${v} ${unit}`}`;
      },
    },
    xAxis: { type: "category", data: x, axisLabel: { fontSize: 10, color: "#6b7280" } },
    yAxis: {
      type: "value",
      inverse: isPace, // faster pace on top
      scale: true,
      axisLabel: { fontSize: 10, color: "#6b7280", formatter: (v: number) => (isPace ? mmss(v) : String(v)) },
    },
    series: [
      {
        type: "line",
        smooth: true,
        showSymbol: false,
        data: yData,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        areaStyle: { color, opacity: 0.08 },
      },
    ],
  };
  return <EChart option={option} height={280} />;
}

// ---- Wellness metric line ----------------------------------------------

export function MetricLineChart({ series }: { series: MetricSeries }) {
  const option: EChartsOption = {
    grid: { left: 44, right: 16, top: 16, bottom: 28 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: series.points.map((p) => md(p.date)), axisLabel: { fontSize: 10, color: "#6b7280" } },
    yAxis: { type: "value", name: series.unit, scale: true, axisLabel: { fontSize: 10, color: "#6b7280" } },
    series: [
      {
        type: "line",
        smooth: true,
        showSymbol: false,
        data: series.points.map((p) => p.value),
        lineStyle: { color: "#16a0c8", width: 2 },
        itemStyle: { color: "#16a0c8" },
        areaStyle: { color: "#16a0c8", opacity: 0.08 },
      },
    ],
  };
  return <EChart option={option} height={280} />;
}

// ---- Fitness history (CTL over time) -----------------------------------

export function FitnessHistoryChart({ points }: { points: PmcPoint[] }) {
  const option: EChartsOption = {
    grid: { left: 40, right: 16, top: 16, bottom: 28 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: points.map((p) => md(p.date)), axisLabel: { fontSize: 10, color: "#6b7280" } },
    yAxis: { type: "value", name: "CTL", axisLabel: { fontSize: 10, color: "#6b7280" } },
    series: [
      {
        type: "line",
        smooth: true,
        showSymbol: false,
        data: points.map((p) => Math.round(p.ctl)),
        lineStyle: { color: FITNESS_COLOR, width: 2 },
        itemStyle: { color: FITNESS_COLOR },
        areaStyle: { color: FITNESS_COLOR, opacity: 0.1 },
      },
    ],
  };
  return <EChart option={option} height={280} />;
}
