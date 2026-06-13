import type { DB } from "../db/client.js";
import { listActivityTracks } from "../db/repo.js";
import type { Modality } from "../db/types.js";

export interface RouteTrack {
  id: number;
  modality: Modality;
  year: number;
  name: string | null;
  /** [lng, lat] pairs, downsampled, GeoJSON order. */
  coords: [number, number][];
}

export interface RouteData {
  tracks: RouteTrack[];
  sports: Modality[];
  years: number[]; // descending
}

/** Cap on points kept per track — plenty for an overview heatmap, keeps the
 * client payload sane even with hundreds of activities. */
const MAX_POINTS = 250;

/** Drop nulls and evenly thin a lat/lng pair down to ~MAX_POINTS, always
 * keeping the final fix so a track doesn't visually stop short. */
export function downsampleTrack(
  lat: (number | null)[],
  lng: (number | null)[],
): [number, number][] {
  const n = Math.min(lat.length, lng.length);
  const valid: number[] = [];
  for (let i = 0; i < n; i++) {
    if (lat[i] != null && lng[i] != null) valid.push(i);
  }
  if (valid.length < 2) return [];
  const step = Math.max(1, Math.ceil(valid.length / MAX_POINTS));
  const out: [number, number][] = [];
  for (let k = 0; k < valid.length; k += step) {
    const i = valid[k];
    out.push([lng[i] as number, lat[i] as number]);
  }
  const last = valid[valid.length - 1];
  const lp: [number, number] = [lng[last] as number, lat[last] as number];
  const tail = out[out.length - 1];
  if (!tail || tail[0] !== lp[0] || tail[1] !== lp[1]) out.push(lp);
  return out;
}

/**
 * Build the route-heatmap dataset: one downsampled track per GPS activity,
 * tagged with modality + year, plus the distinct sports/years for filter chips.
 */
export function getRouteData(db: DB): RouteData {
  const rows = listActivityTracks(db);
  const tracks: RouteTrack[] = [];
  const sports = new Set<Modality>();
  const years = new Set<number>();

  for (const r of rows) {
    let ch: Record<string, (number | null)[]>;
    try {
      ch = JSON.parse(r.channels);
    } catch {
      continue;
    }
    const lat = ch.lat;
    const lng = ch.lng;
    if (!Array.isArray(lat) || !Array.isArray(lng)) continue;
    const coords = downsampleTrack(lat, lng);
    if (coords.length < 2) continue;

    const year = Number(r.local_date.slice(0, 4));
    tracks.push({ id: r.id, modality: r.modality, year, name: r.name, coords });
    sports.add(r.modality);
    years.add(year);
  }

  return {
    tracks,
    sports: [...sports],
    years: [...years].sort((a, b) => b - a),
  };
}
