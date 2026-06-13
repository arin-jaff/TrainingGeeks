import { getDb } from "@/lib/db/client";
import { getRouteData } from "@/lib/queries/routes";
import HeatmapLoader from "@/components/routes/HeatmapLoader";

export const dynamic = "force-dynamic";

export default function RoutesPage() {
  const { tracks, sports, years } = getRouteData(getDb());
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-ink">Routes Heatmap</h1>
        <p className="text-sm text-ink-muted">
          Every GPS track you&apos;ve recorded, overlaid on one map. Bright corridors are the
          roads and trails you return to most.
        </p>
      </div>
      <HeatmapLoader tracks={tracks} sports={sports} years={years} />
    </div>
  );
}
