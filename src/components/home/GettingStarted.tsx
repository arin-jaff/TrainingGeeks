import Link from "next/link";

/**
 * First-run checklist, shown on Home until the first activity exists. Three
 * concrete paths into the app — sync, file import, manual — each one click
 * from where it happens.
 */
export default function GettingStarted() {
  const steps: { title: string; body: string; href: string; cta: string }[] = [
    {
      title: "Connect intervals.icu",
      body: "One connection brings in Garmin, Wahoo, Strava, and more — history included.",
      href: "/settings",
      cta: "Open Settings",
    },
    {
      title: "Import a FIT file",
      body: "Drop activity files straight from your watch or head unit.",
      href: "/import",
      cta: "Open Import",
    },
    {
      title: "Set your zones",
      body: "FTP, threshold HR, or threshold pace — they power TSS, IF, and time-in-zone.",
      href: "/settings",
      cta: "Set Zones",
    },
  ];

  return (
    <section className="mb-4 rounded border border-accent/30 bg-accent/5 p-4">
      <h2 className="text-sm font-semibold text-ink">Welcome to TrainingGeeks</h2>
      <p className="mt-0.5 text-sm text-ink-muted">
        Your training log is empty — three ways to change that:
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded border border-line bg-surface-card p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{s.body}</p>
            <Link
              href={s.href}
              className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
            >
              {s.cta} →
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        Or hover any date on the <Link href="/calendar" className="text-accent hover:underline">calendar</Link> and
        press + to log a workout by hand.
      </p>
    </section>
  );
}
