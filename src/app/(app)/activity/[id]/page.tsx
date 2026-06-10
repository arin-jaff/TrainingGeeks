import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import {
  getAthlete,
  listActivityFiles,
  listAllStrengthSets,
  listDailyLoad,
  listEquipment,
  listStrengthSets,
} from "@/lib/db/repo";
import { getActivityDetail } from "@/lib/queries/activity";
import { isReadOnly } from "@/lib/auth/config";
import type { Modality, Units } from "@/lib/db/types";
import { formatDistance, formatDuration, MODALITY_LABEL } from "@/lib/util/format";
import { MODALITY_COLOR } from "@/lib/util/colors";
import { todayLocal } from "@/lib/util/dates";
import { exerciseDisplayName } from "@/lib/strength/naming";
import AnalyzeView from "@/components/activity/AnalyzeView";
import SportImage from "@/components/SportImage";
import EditActivityButton from "@/components/activity/EditActivityButton";
import FilesButton from "@/components/activity/FilesButton";
import StrengthSets from "@/components/activity/StrengthSets";

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
    <div
      className="flex items-center gap-1 rounded px-2.5 py-1 text-white"
      style={{ backgroundColor: color }}
    >
      <span className="text-[11px] font-medium">{label}</span>
      <span className="text-sm font-semibold tabular-nums">
        {Math.round(value)}
      </span>
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
  const tz = getAthlete(db)?.timezone ?? "America/New_York";
  const equipment = listEquipment(db);
  const images = listActivityFiles(db, a.id)
    .filter((f) => f.is_image === 1)
    .map((f) => ({ id: f.id, filename: f.filename }));
  const fit = listDailyLoad(db, "all", a.local_date, a.local_date)[0];
  const isStrength = modality === "lift" || modality === "core";
  const stress = isStrength ? a.s3 : a.tss;
  const stressLabel = isStrength ? "S³" : "TSS";

  const strengthSets = isStrength ? listStrengthSets(db, a.id) : [];
  const knownExercises = isStrength
    ? [
        ...new Set(
          listAllStrengthSets(db)
            .map((s) => exerciseDisplayName(s.exercise_key, s.exercise_name))
            .filter((n) => n && n !== "Unnamed"),
        ),
      ].sort()
    : [];

  return (
    <div>
      <div className="mb-4 border-b border-line pb-3">
        <div className="mb-1 text-sm font-medium uppercase tracking-wide text-ink-muted">
          {longDate(a.local_date)}
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-3">
            <SportImage modality={modality} size={44} />
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
          <div className="ml-auto flex items-center gap-3">
            {fit && (
              <div className="flex gap-2">
                <Pill label="Fitness" value={fit.ctl} color="#1840ec" />
                <Pill label="Fatigue" value={fit.atl} color="#e63788" />
                <Pill label="Form" value={fit.tsb} color="#fd6b00" />
              </div>
            )}
            <FilesButton activityId={a.id} />
            <EditActivityButton
              activityId={a.id}
              units={units}
              today={todayLocal(tz)}
              equipment={equipment}
            />
          </div>
        </div>
      </div>

      <AnalyzeView detail={detail} units={units} images={images} />

      {isStrength && (
        <StrengthSets
          activityId={a.id}
          sets={strengthSets}
          knownExercises={knownExercises}
          units={units}
          readOnly={isReadOnly()}
        />
      )}
    </div>
  );
}
