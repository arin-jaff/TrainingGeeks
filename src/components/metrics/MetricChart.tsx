"use client";

import type { EChartsOption } from "echarts";
import EChart from "@/components/charts/EChart";

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

export default function MetricChart({
  series,
  label,
  unit,
}: {
  series: { date: string; value: number }[];
  label: string;
  unit: string;
}) {
  if (series.length < 2) {
    return (
      <p className="py-16 text-center text-sm text-ink-muted">
        Not enough entries to chart {label} yet — log a few to see the trend.
      </p>
    );
  }
  const option: EChartsOption = {
    grid: { left: 48, right: 16, top: 20, bottom: 28 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (v) => `${v} ${unit}`,
    },
    xAxis: {
      type: "category",
      data: series.map((p) => md(p.date)),
      axisLabel: { fontSize: 10, color: "#6b7280" },
    },
    yAxis: {
      type: "value",
      scale: true,
      axisLabel: { fontSize: 10, color: "#6b7280" },
    },
    series: [
      {
        type: "line",
        smooth: true,
        showSymbol: series.length < 60,
        data: series.map((p) => p.value),
        lineStyle: { color: "#2f6fed", width: 2 },
        itemStyle: { color: "#2f6fed" },
        areaStyle: { color: "#2f6fed", opacity: 0.08 },
      },
    ],
  };
  return <EChart option={option} height={300} />;
}
