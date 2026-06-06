import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { getAthlete } from "@/lib/db/repo";
import { getCalendarData } from "@/lib/queries/calendar";
import { addMonths, monthMatrix, todayLocal } from "@/lib/util/dates";
import type { Units } from "@/lib/db/types";
import CalendarGrid from "@/components/calendar/CalendarGrid";

export const dynamic = "force-dynamic";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const db = getDb();
  const athlete = getAthlete(db);
  const tz = athlete?.timezone ?? "America/New_York";
  const units: Units = athlete?.units ?? "imperial";
  const today = todayLocal(tz);

  const { month: monthParam } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? (monthParam as string)
    : today.slice(0, 7);

  const weeks = monthMatrix(month);
  const { itemsByDate, weekSummaries } = getCalendarData(db, weeks);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-ink">{monthLabel(month)}</h1>
        <div className="flex items-center gap-1">
          <Link
            href={`/calendar?month=${addMonths(month, -1)}`}
            className="rounded border border-line px-2 py-0.5 text-sm text-ink-muted hover:bg-surface-card"
            aria-label="Previous month"
          >
            ‹
          </Link>
          <Link
            href="/calendar"
            className="rounded border border-line px-2 py-0.5 text-sm text-ink-muted hover:bg-surface-card"
          >
            Today
          </Link>
          <Link
            href={`/calendar?month=${addMonths(month, 1)}`}
            className="rounded border border-line px-2 py-0.5 text-sm text-ink-muted hover:bg-surface-card"
            aria-label="Next month"
          >
            ›
          </Link>
        </div>
        <Link
          href="/import"
          className="ml-auto rounded bg-accent px-3 py-1 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Upload
        </Link>
      </div>

      <CalendarGrid
        weeks={weeks}
        itemsByDate={itemsByDate}
        weekSummaries={weekSummaries}
        month={month}
        today={today}
        units={units}
      />
    </div>
  );
}
