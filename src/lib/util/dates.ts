/** Calendar-day helpers operating on YYYY-MM-DD strings in UTC arithmetic. */

export function todayLocal(tz: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD; the tz shifts the calendar day correctly.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The local calendar date (YYYY-MM-DD) of an instant in a timezone. */
export function localDateInTz(iso: string, tz: string): string {
  return todayLocal(tz, new Date(iso));
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
