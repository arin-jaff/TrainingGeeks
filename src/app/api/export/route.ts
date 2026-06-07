import { getDb } from "@/lib/db/client";
import { getAthlete, listActivitiesBetween } from "@/lib/db/repo";
import { formatDistance, formatDuration, MODALITY_LABEL } from "@/lib/util/format";
import type { Modality, Units } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.get("from") ?? "")
    ? params.get("from")!
    : "2000-01-01";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.get("to") ?? "")
    ? params.get("to")!
    : "9999-12-31";

  const db = getDb();
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const acts = listActivitiesBetween(db, from, to);

  const headers = [
    "Date", "Start Time", "Sport", "Title", "Duration", "Distance",
    "TSS", "S3", "NP", "IF", "VI", "EF", "Decoupling %",
    "Avg HR", "Max HR", "Avg Power", "Work (kJ)", "Calories",
  ];
  const rows = acts.map((a) => {
    const m = a.modality as Modality;
    return [
      a.local_date,
      a.start_time,
      MODALITY_LABEL[m] ?? m,
      a.name ?? "",
      formatDuration(a.duration_s),
      a.distance_m != null ? formatDistance(a.distance_m, units) : "",
      a.tss ?? "",
      a.s3 ?? "",
      a.np ?? "",
      a.intensity_factor ?? "",
      a.variability_index ?? "",
      a.efficiency_factor ?? "",
      a.decoupling ?? "",
      a.avg_hr ?? "",
      a.max_hr ?? "",
      a.avg_power ?? "",
      a.kj ?? "",
      a.calories ?? "",
    ].map(csvCell).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="traininggeeks-export-${from}_${to}.csv"`,
    },
  });
}
