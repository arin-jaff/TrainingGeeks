import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { authEnabled, isReadOnly } from "@/lib/auth/config";
import { GITHUB_URL } from "@/lib/constants";
import { getDb } from "@/lib/db/client";
import { getAthlete } from "@/lib/db/repo";
import SportImage from "@/components/SportImage";
import { MODALITY_LABEL } from "@/lib/util/format";
import type { Modality } from "@/lib/db/types";

// Auth state comes from runtime env, not build time.
export const dynamic = "force-dynamic";

const SPORTS: Modality[] = ["run", "bike", "swim", "row", "lift", "core"];

const FEATURES: { title: string; body: string }[] = [
  { title: "A calendar that plans and remembers", body: "Drag workouts around, log what you actually did, and watch completed days turn green while the ones you skipped go an accusatory red." },
  { title: "Three key metrics", body: "Fitness, Fatigue, and Form — CTL, ATL and TSB — charted per sport, no asterisk telling you to upgrade." },
  { title: "Dashboards you control", body: "Add and remove charts with a click. PMC, time-in-zone, peak curves, weekly everything. Build the view you want." },
  { title: "Peak performances which earn hardware", body: "Mean-maximal power, pace, and heart-rate curves, and gold/silver/bronze on your best efforts." },
  { title: "Zones, thresholds, and plans", body: "HR / power / pace zones from real methods, plus structured training plans you can drop onto the calendar." },
  { title: "Auto-sync with your preferred platforms", body: "Bring your activities and planned workouts in automatically. Partnered seamlessly with Intervals.icu to connect Garmin, Polar, Apple, and more." },
];

function GitHubMark({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const readOnly = isReadOnly();
  // Open local instances have nothing to gate — go straight in. Read-only
  // demos show this page as a public "View Live!" landing.
  if (!authEnabled() && !readOnly) redirect("/");
  const { error } = await searchParams;
  const founder = getAthlete(getDb())?.name ?? "the founder";

  return (
    <div className="bg-nav">
      {/* ===== Fold: sign-in + hero ===== */}
      <div className="relative flex min-h-screen">
        {/* Small screens: full-bleed hero behind the form. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/login-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover lg:hidden" />
        <div className="absolute inset-0 bg-nav/75 lg:hidden" />

        {/* Left: sign-in form */}
        <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 lg:w-[460px] lg:flex-none">
          <div className="w-full max-w-sm">
            <div className="mb-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-wordmark.png" alt="TrainingGeeks" className="mx-auto h-48 w-auto" />
              <p className="mt-1 text-xs text-white/50">
                {readOnly ? "Live, self-hosted training data" : "Your self-hosted training log"}
              </p>
            </div>
            {readOnly ? (
              <div className="rounded border border-white/10 bg-surface-card p-6 shadow-lg">
                <div className="mb-3 flex items-center gap-2">
                </div>
                <p className="text-sm leading-relaxed text-ink-muted" style={{textAlign: "center"}}>
                  Check out <strong className="text-ink"> the founder&apos;s live
                  training data</strong>, so you can see how TrainingGeeks works in practice! Live from June 1, 2026 onward.
                  <br />
                 <br />
                  It&apos;s served <strong className="text-ink">read-only</strong> on a simple
                  Raspberry Pi at home, auto-syncing from intervals.icu and Garmin — super easy to
                  set up and run yourself!
                </p>
                <Link
                  href="/?enter=1"
                  className="mt-4 block w-full rounded bg-accent px-3 py-2 text-center text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  View Live →
                </Link>
              </div>
            ) : (
              <div className="rounded border border-white/10 bg-surface-card p-6 shadow-lg">
                <form action={loginAction} className="space-y-3">
                  <label className="block text-sm font-medium text-ink" htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoFocus
                    autoComplete="current-password"
                    className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  {error === "config" ? (
                    <p className="text-sm text-fatigue">
                      Server isn&apos;t configured: set <code>TG_SESSION_SECRET</code>.
                    </p>
                  ) : error ? (
                    <p className="text-sm text-fatigue">Incorrect password.</p>
                  ) : null}
                  <button type="submit" className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover">
                    Sign in
                  </button>
                </form>
              </div>
            )}

            {/* Supported disciplines */}
            <div className="mt-7">
              <p className="text-center text-[11px] uppercase tracking-wide text-white/40">Track every discipline</p>
              <div className="mt-2.5 flex justify-center gap-2">
                {SPORTS.map((m) => (
                  <div key={m} title={MODALITY_LABEL[m]} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 shadow-sm">
                    <SportImage modality={m} size={22} />
                  </div>
                ))}
              </div>
            </div>

            {/* intervals.icu + GitHub */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <span>Syncs with</span>
                <a href="https://intervals.icu" target="_blank" rel="noreferrer" className="inline-flex items-center rounded bg-white px-2 py-1 shadow-sm hover:opacity-90">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/intervals-wordmark.png" alt="intervals.icu" className="h-3.5 w-auto" />
                </a>
              </div>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/60 hover:text-white">
                <GitHubMark className="h-3.5 w-3.5" /> Free &amp; open source — view the code
              </a>
            </div>
          </div>
        </div>

        {/* Right: hero photo (desktop) */}
        <div className="relative hidden flex-1 lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/login-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-nav/80 via-nav/30 to-nav/60" />

          {/* Top-right: logo + headline overlay */}
          <div className="absolute right-8 top-8 max-w-lg rounded-2xl border border-white/10 bg-nav/45 p-8 text-right shadow-lg backdrop-blur-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark.png" alt="" className="mb-5 h-auto w-full" />
            <p className="text-4xl font-bold leading-tight text-white">
              A training platform built for you, <span className="text-accent">by you</span>.
            </p>
            <p className="mt-3 text-lg text-white/70">
              Open source. Self-hosted. No subscription.
            </p>
          </div>

          {/* Bottom-left: tagline */}
          <div className="absolute bottom-12 left-10 max-w-2xl">
            <p className="text-6xl font-semibold leading-tight text-white drop-shadow">Own Your Training.</p>
            <p className="mt-4 text-xl leading-relaxed text-white/75 drop-shadow">
              Every workout, metric, and trend. One platform that you can make your own. <br /> Scroll down if
              you&apos;ve ever paid a monthly fee to look at your own heart rate.
            </p>
          </div>
        </div>
      </div>

      {/* ===== Landing: the pitch ===== */}
      <section className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="mx-auto h-48 w-auto" />
          <p className="text-xs uppercase tracking-wide text-white/40">Open source · Self-hosted · Yours Forever</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-5xl">
            We&apos;re tired of the proprietary.<span className="text-accent"> We&apos;re here to set PRs.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
            You train hard for your precious data. Now you can track all of it, exactly how YOU want, for free.
            This is the platform you&apos;ve been looking for. You know the one — shaped vaguely like a mountain range, that puts <em>your</em> VO₂max
            behind a &quot;Premium&quot; button and charges you monthly to scroll your own calendar.
            TrainingGeeks is that. <span className="font-semibold text-white">Minus the invoice. Plus the entire source code, so you can host it yourself and make it your own.</span>
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded bg-white px-5 py-2.5 text-sm font-semibold text-nav hover:opacity-90">
              <GitHubMark /> Star it on GitHub
            </a>
            <a href="#features" className="rounded border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:border-white/50">
              See what it does
            </a>
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="bg-surface px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">
              Everything you actually use.
              <br />
              <span className="text-accent">Anything you want to add.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-muted">
              We rebuilt the parts of the big-name analytics suite that athletes open every day —
              then made them yours to keep, tweak, and host.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border border-line bg-surface-card p-5">
                <h3 className="text-sm font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{f.body}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-3xl text-center">
            <h3 className="text-2xl font-bold text-ink sm:text-3xl">Endless additional features.</h3>
            <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
              TrainingGeeks is forever open source. Built by a community of athletes, for a
              community of athletes.
            </p>
            <p className="mt-4 text-xl font-semibold leading-snug text-ink sm:text-xl">
              Bring <span className="text-accent">PRs</span> (Pull Requests) so that we can keep
              hitting <span className="text-accent">PRs</span> (Personal Records).
            </p>
          </div>
        </div>
      </section>

      {/* ===== Product screenshots ===== */}
      <section className="bg-surface px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">See it in action</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-ink-muted">
            Real screens from the app — your calendar, your dashboards, your analysis. No mockups.
          </p>
          <div className="mt-10 space-y-6">
            {[
              { src: "/shots/dashboard.png", cap: "Dashboard — add and remove the charts you care about." },
              { src: "/shots/calendar.png", cap: "Calendar — plan, log, and see compliance at a glance." },
              { src: "/shots/activity.png", cap: "Activity analysis — every metric, planned vs. completed." },
              { src: "/shots/activity-analyze.png", cap: "Analyze — route map, elevation, HR, power, and pace on one timeline." },
            ].map((s) => (
              <figure key={s.src} className="overflow-hidden rounded-xl border border-line bg-surface-card shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.cap} className="w-full" />
                <figcaption className="border-t border-line px-4 py-2.5 text-center text-xs text-ink-muted">
                  {s.cap}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Open source CTA ===== */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Open source. Self-hosted. Yours Forever.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/70">
            Your activities live in a database on <em>your</em> machine — not our cloud, because we
            don&apos;t have one (and never will ask for your card). Don&apos;t like a chart? Change
            it. Missing a feature? Build it — or{" "}
            <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noreferrer" className="text-accent hover:underline">open an issue</a>{" "}
            and guilt us into it. No subscription has ever made an athlete faster.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover">
              <GitHubMark /> Get the code
            </a>
            <Link href="/privacy" className="rounded border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:border-white/50">
              Read the privacy policy
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-xs text-white/50 sm:flex-row">
          <span>TrainingGeeks — open-source, self-hosted training software. Your data, your machine.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-white/70 hover:text-white">
              <GitHubMark className="h-3.5 w-3.5" /> GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
