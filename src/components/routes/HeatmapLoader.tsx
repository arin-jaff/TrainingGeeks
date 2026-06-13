"use client";

import dynamic from "next/dynamic";
import type { Modality } from "@/lib/db/types";
import type { RouteTrack } from "@/lib/queries/routes";

// maplibre-gl touches the DOM at import time, so load the map only on the
// client (same pattern as the activity RouteMap).
const Heatmap = dynamic(() => import("./Heatmap"), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: "72vh", minHeight: 420 }}
      className="flex items-center justify-center rounded border border-line bg-[#0b1020] text-sm text-white/50"
    >
      Loading map…
    </div>
  ),
});

export default function HeatmapLoader(props: {
  tracks: RouteTrack[];
  sports: Modality[];
  years: number[];
}) {
  return <Heatmap {...props} />;
}
