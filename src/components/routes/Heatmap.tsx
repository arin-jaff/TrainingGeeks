"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Modality } from "@/lib/db/types";
import type { RouteTrack } from "@/lib/queries/routes";
import { MODALITY_COLOR } from "@/lib/util/colors";
import { MODALITY_LABEL } from "@/lib/util/format";

// Free dark basemap (no API key) for the "look what I've covered" canvas.
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0b1020" } },
    { id: "carto", type: "raster", source: "carto" },
  ],
};

// MapLibre paint expression: color each track line by its sport.
const SPORT_COLOR_EXPR = [
  "match",
  ["get", "modality"],
  "run",
  MODALITY_COLOR.run,
  "bike",
  MODALITY_COLOR.bike,
  "swim",
  MODALITY_COLOR.swim,
  "row",
  MODALITY_COLOR.row,
  "lift",
  MODALITY_COLOR.lift,
  "core",
  MODALITY_COLOR.core,
  "#f97316",
] as unknown as maplibregl.ExpressionSpecification;

function toFeatureCollection(tracks: RouteTrack[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: tracks.map((t) => ({
      type: "Feature",
      properties: { modality: t.modality, year: t.year },
      geometry: { type: "LineString", coordinates: t.coords },
    })),
  };
}

export default function Heatmap({
  tracks,
  sports,
  years,
}: {
  tracks: RouteTrack[];
  sports: Modality[];
  years: number[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [sport, setSport] = useState<Modality | "all">("all");
  const [year, setYear] = useState<number | "all">("all");

  const data = useMemo(() => toFeatureCollection(tracks), [tracks]);

  // Build + tear down the map once. Track data is static for the page load.
  useEffect(() => {
    if (!ref.current || tracks.length === 0) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: DARK_STYLE,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("tracks", { type: "geojson", data });
      map.addLayer({
        id: "tracks",
        type: "line",
        source: "tracks",
        layout: { "line-join": "round", "line-cap": "round" },
        // Low opacity so overlapping passes accumulate into bright,
        // frequently-travelled corridors (the heatmap effect).
        paint: {
          "line-color": SPORT_COLOR_EXPR,
          "line-width": 1.6,
          "line-opacity": 0.45,
          "line-blur": 0.4,
        },
      });

      const bounds = new maplibregl.LngLatBounds();
      for (const t of tracks) for (const c of t.coords) bounds.extend(c);
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [data, tracks]);

  // Apply sport/year chips as a MapLibre filter (no source rebuild).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (!map.getLayer("tracks")) return;
      const conds: maplibregl.FilterSpecification[] = [];
      if (sport !== "all") conds.push(["==", ["get", "modality"], sport] as unknown as maplibregl.FilterSpecification);
      if (year !== "all") conds.push(["==", ["get", "year"], year] as unknown as maplibregl.FilterSpecification);
      const filter =
        conds.length === 0
          ? null
          : (["all", ...conds] as unknown as maplibregl.FilterSpecification);
      map.setFilter("tracks", filter);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [sport, year]);

  const chip = (active: boolean) =>
    [
      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
      active
        ? "bg-accent text-white"
        : "border border-line bg-surface-card text-ink hover:border-accent",
    ].join(" ");

  if (tracks.length === 0) {
    return (
      <div className="rounded border border-dashed border-line px-4 py-20 text-center">
        <p className="text-sm text-ink-muted">
          No GPS activities yet. Import or sync activities with a route to see your heatmap.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-ink-muted">Sport</span>
          <button onClick={() => setSport("all")} className={chip(sport === "all")}>
            All
          </button>
          {sports.map((s) => (
            <button key={s} onClick={() => setSport(s)} className={chip(sport === s)}>
              {MODALITY_LABEL[s]}
            </button>
          ))}
        </div>
        {years.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-ink-muted">Year</span>
            <button onClick={() => setYear("all")} className={chip(year === "all")}>
              All
            </button>
            {years.map((y) => (
              <button key={y} onClick={() => setYear(y)} className={chip(year === y)}>
                {y}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        ref={ref}
        style={{ height: "72vh", minHeight: 420 }}
        className="overflow-hidden rounded border border-line bg-[#0b1020]"
      />
    </div>
  );
}
