"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export default function RouteMap({
  lat,
  lng,
  height = 320,
}: {
  lat: (number | null)[];
  lng: (number | null)[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const coords: [number, number][] = [];
    for (let i = 0; i < lat.length; i++) {
      const a = lat[i];
      const o = lng[i];
      if (a != null && o != null) coords.push([o, a]);
    }
    if (coords.length < 2) return;

    const map = new maplibregl.Map({
      container: ref.current,
      style: OSM_STYLE,
      attributionControl: { compact: true },
    });

    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      });
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2f6fed", "line-width": 3 },
      });
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0]),
      );
      map.fitBounds(bounds, { padding: 28, duration: 0 });
    });

    return () => map.remove();
  }, [lat, lng]);

  return <div ref={ref} style={{ width: "100%", height }} className="rounded" />;
}
