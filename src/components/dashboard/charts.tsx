"use client";

import type { EChartsOption } from "echarts";
import EChart from "@/components/charts/EChart";
import type {
  PmcPoint,
  SummarySlice,
  Totals,
  WeekBar,
  ZoneTime,
} from "@/lib/queries/dashboard";
import { MODALITY_COLOR, PMC_COLOR } from "@/lib/util/colors";
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

export function PmcChart({ points }: { points: PmcPoint[] }) {
  const dates = points.map((p) => md(p.date));
  const option: EChartsOption = {
    grid: { left: 44, right: 48, top: 28, bottom: 28 },
    legend: { top: 0, itemWidth: 14, textStyle: { fontSize: 11 } },
    tooltip: { trigger: "axis" },
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
