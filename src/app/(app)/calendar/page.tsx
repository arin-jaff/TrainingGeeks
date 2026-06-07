import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { getAthlete, listEquipment, listInjuries } from "@/lib/db/repo";
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

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:bg-surface-card hover:text-ink";

function RailItem({
  label,
  href = "#",
  children,
}: {
  label: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 rounded px-1 py-2 text-center text-[10px] leading-tight text-ink-muted hover:bg-surface-card hover:text-accent"
    >
      <span className="text-accent">{children}</span>
      {label}
    </Link>
  );
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
  const { itemsByDate, weekSummaries, injuredDates } = getCalendarData(
    db,
    weeks,
    today,
  );
  const equipment = listEquipment(db);
  const openInjuries = listInjuries(db).filter((i) => i.end_date == null);

  return (
    <div className="flex gap-3">
      {/* Left rail */}
      <aside className="flex w-16 shrink-0 flex-col gap-1 pt-1">
        <RailItem label="Workout Library">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h11v15H4zM15 5h5v15h-5" /><path d="M7 9h5M7 13h5" /></svg>
        </RailItem>
        <RailItem label="Training Plans" href="/atp">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
        </RailItem>
        <RailItem label="Routes Library">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M6 8.5v4a4 4 0 004 4h4" /></svg>
        </RailItem>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-2">
          <h1 className="text-xl font-bold text-ink">{monthLabel(month)}</h1>
          <span aria-hidden className="text-ink-muted">
            ▾
          </span>
          <Link
            href="/calendar"
            className="ml-1 rounded border border-line px-3 py-1 text-sm text-ink hover:bg-surface-card"
          >
            Today
          </Link>
          <Link
            href={`/calendar?month=${addMonths(month, -1)}`}
            className={iconBtn}
            aria-label="Previous month"
          >
            ‹
          </Link>
          <Link
            href={`/calendar?month=${addMonths(month, 1)}`}
            className={iconBtn}
            aria-label="Next month"
          >
            ›
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <Link href="/import" className={iconBtn} aria-label="Upload" title="Upload">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
            </Link>
            <Link href="/settings" className={iconBtn} aria-label="Sync" title="Sync">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 01-9 9 9 9 0 01-7-3.5M3 12a9 9 0 019-9 9 9 0 017 3.5" /><path d="M21 4v4h-4M3 20v-4h4" /></svg>
            </Link>
            <span className={iconBtn} aria-label="Search" title="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            </span>
            <Link href="/settings" className={iconBtn} aria-label="Settings" title="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 01-4 0v-.1A1.7 1.7 0 005 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003 13.6H3a2 2 0 010-4h.1A1.7 1.7 0 004.6 5l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V1a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H23a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>
            </Link>
          </div>
        </div>

        <CalendarGrid
          weeks={weeks}
          itemsByDate={itemsByDate}
          weekSummaries={weekSummaries}
          injuredDates={injuredDates}
          openInjuries={openInjuries}
          equipment={equipment}
          month={month}
          today={today}
          units={units}
        />
      </div>
    </div>
  );
}
