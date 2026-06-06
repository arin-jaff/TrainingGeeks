"use client";

import type { EChartsOption } from "echarts";
import EChart from "@/components/charts/EChart";
import type { PmcPoint, SummarySlice, WeekBar } from "@/lib/queries/dashboard";
import { MODALITY_COLOR, PMC_COLOR } from "@/lib/util/colors";
import { MODALITY_LABEL } from "@/lib/util/format";
import type { Modality } from "@/lib/db/types";

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
      { type: "value", axisLabel: { fontSize: 10, color: "#6b7280" } },
      {
        type: "value",
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
