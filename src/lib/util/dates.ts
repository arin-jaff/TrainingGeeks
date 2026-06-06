/** Calendar-day helpers operating on YYYY-MM-DD strings in UTC arithmetic. */

/** Format an instant as its YYYY-MM-DD calendar date in a timezone. */
function formatInTz(d: Date, tz: string): string {
  // en-CA formats as YYYY-MM-DD; the tz shifts the calendar day correctly.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayLocal(tz: string, now: Date = new Date()): string {
  // Allow pinning "today" for deterministic screenshots / testing. This only
  // affects what "now" is, never how a given instant is formatted.
  const override =
    typeof process !== "undefined" ? process.env?.TG_TODAY : undefined;
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  return formatInTz(now, tz);
}

/** The local calendar date (YYYY-MM-DD) of an instant in a timezone. */
export function localDateInTz(iso: string, tz: string): string {
  return formatInTz(new Date(iso), tz);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86400000);
}

/** Inclusive list of every calendar date from start to end. */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  if (diffDays(start, end) < 0) return out;
  let cur = start;
  while (diffDays(cur, end) >= 0) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Day of week with Monday=0 ... Sunday=6. */
export function weekdayMon0(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // Sun=0
  return (js + 6) % 7;
}

/** The Monday on or before `date`. */
export function startOfWeekMonday(date: string): string {
  return addDays(date, -weekdayMon0(date));
}

/** YYYY-MM (month) of a date. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/**
 * A month grid as weeks of 7 dates (Mon..Sun), padded to cover the whole
 * month. `month` is "YYYY-MM".
 */
export function monthMatrix(month: string): string[][] {
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${month}-${String(lastDay).padStart(2, "0")}`;
  const gridStart = startOfWeekMonday(first);
  const gridEnd = addDays(startOfWeekMonday(last), 6);
  const days = eachDay(gridStart, gridEnd);
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}
