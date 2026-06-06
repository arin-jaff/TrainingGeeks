import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getAthlete, listDailyLoad } from "@/lib/db/repo";
import { getActivityDetail } from "@/lib/queries/activity";
import type { Modality, Units } from "@/lib/db/types";
import { formatDistance, formatDuration, MODALITY_LABEL } from "@/lib/util/format";
import { MODALITY_COLOR } from "@/lib/util/colors";
import AnalyzeView from "@/components/activity/AnalyzeView";

export const dynamic = "force-dynamic";

function longDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Pill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded px-2 py-1 text-center text-white ${color}`}>
      <span className="text-sm font-semibold tabular-nums">
        {Math.round(value)}
      </span>
      <span className="ml-1 text-[10px] uppercase opacity-90">{label}</span>
    </div>
  );
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const detail = getActivityDetail(db, Number(id));
  if (!detail) notFound();

  const a = detail.activity;
  const modality = a.modality as Modality;
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const fit = listDailyLoad(db, "all", a.local_date, a.local_date)[0];
  const isStrength = modality === "lift" || modality === "core";
  const stress = isStrength ? a.s3 : a.tss;
  const stressLabel = isStrength ? "S³" : "TSS";

  return (
    <div>
      <div className="mb-4 border-b border-line pb-3">
        <div className="mb-1 text-sm font-medium uppercase tracking-wide text-ink-muted">
          {longDate(a.local_date)}
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: MODALITY_COLOR[modality] }}
              aria-hidden
            />
            <h1 className="text-xl font-semibold text-ink">
              {a.name ?? MODALITY_LABEL[modality]}
            </h1>
          </div>
          <div className="flex gap-4 text-sm text-ink">
            <span className="font-semibold">{formatDuration(a.duration_s)}</span>
            <span className="font-semibold">
              {formatDistance(a.distance_m, units)}
            </span>
            {stress != null && (
              <span className="font-semibold">
                {Math.round(stress)} {stressLabel}
              </span>
            )}
          </div>
          {fit && (
            <div className="ml-auto flex gap-2">
              <Pill label="Fatigue" value={fit.atl} color="bg-fatigue" />
              <Pill label="Fitness" value={fit.ctl} color="bg-fitness" />
              <Pill label="Form" value={fit.tsb} color="bg-form" />
            </div>
          )}
        </div>
      </div>

      <AnalyzeView detail={detail} units={units} />
    </div>
  );
}
