"use client";

import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

function fmtClock(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export interface StreamSeries {
  label: string;
  data: (number | null)[];
  color: string;
  scale: string;
  fill?: string;
}

export default function StreamChart({
  time,
  series,
  height = 280,
}: {
  time: number[];
  series: StreamSeries[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const data: uPlot.AlignedData = [
      time,
      ...series.map((s) => s.data as (number | null)[]),
    ];

    const opts: uPlot.Options = {
      width: el.clientWidth || 600,
      height,
      cursor: { focus: { prox: 16 } },
      scales: { x: { time: false } },
      axes: [
        {
          values: (_u, splits) => splits.map((v) => fmtClock(v)),
          stroke: "#6b7280",
          grid: { stroke: "#eef0f3" },
        },
        { stroke: "#6b7280", grid: { stroke: "#eef0f3" } },
      ],
      series: [
        { value: (_u, v) => (v == null ? "" : fmtClock(v)) },
        ...series.map((s) => ({
          label: s.label,
          stroke: s.color,
          width: 1.5,
          scale: s.scale,
          fill: s.fill,
          points: { show: false },
        })),
      ],
    };

    const u = new uPlot(opts, data, el);
    plot.current = u;
    const ro = new ResizeObserver(() => {
      u.setSize({ width: el.clientWidth, height });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      u.destroy();
      plot.current = null;
    };
  }, [time, series, height]);

  return <div ref={ref} className="w-full" />;
}
