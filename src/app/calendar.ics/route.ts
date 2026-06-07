import { getDb } from "@/lib/db/client";
import { getAthlete, listActivitiesBetween } from "@/lib/db/repo";
import { authEnabled, getSyncToken } from "@/lib/auth/config";
import { formatDistance, formatDuration, MODALITY_LABEL } from "@/lib/util/format";
import type { Modality, Units } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function icsTime(iso: string): string {
  // -> YYYYMMDDTHHMMSSZ (UTC)
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function duration(seconds: number | null): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `PT${h}H${m}M${sec}S`;
}

export async function GET(req: Request) {
  // The feed is meant for external calendar apps (no session cookie); when a
  // password is set, require the sync token as ?token=.
  if (authEnabled()) {
    const token = new URL(req.url).searchParams.get("token");
    const expected = getSyncToken();
    if (!expected || token !== expected) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const db = getDb();
  const units: Units = getAthlete(db)?.units ?? "imperial";
  const acts = listActivitiesBetween(db, "2000-01-01", "9999-12-31");
  const stamp = icsTime(new Date().toISOString());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TrainingGeeks//Activity Feed//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:TrainingGeeks",
  ];

  for (const a of acts) {
    const m = a.modality as Modality;
    const label = MODALITY_LABEL[m] ?? m;
    const isStrength = m === "lift" || m === "core";
    const stress = isStrength ? a.s3 : a.tss;
    const stressLabel = isStrength ? "S³" : "TSS";
    const bits: string[] = [formatDuration(a.duration_s)];
    if (a.distance_m != null) bits.push(formatDistance(a.distance_m, units));
    if (stress != null) bits.push(`${Math.round(stress)} ${stressLabel}`);
    if (a.avg_hr != null) bits.push(`avg HR ${Math.round(a.avg_hr)}`);
    if (a.np != null) bits.push(`NP ${Math.round(a.np)}W`);

    const summary = a.distance_m != null
      ? `${label} — ${formatDistance(a.distance_m, units)}`
      : `${label} — ${formatDuration(a.duration_s)}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:tg-activity-${a.id}@traininggeeks`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsTime(a.start_time)}`,
      `DURATION:${duration(a.duration_s)}`,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(bits.join(" · "))}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="traininggeeks.ics"',
    },
  });
}
