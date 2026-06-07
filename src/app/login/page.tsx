import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { authEnabled } from "@/lib/auth/config";
import SportImage from "@/components/SportImage";
import { MODALITY_LABEL } from "@/lib/util/format";
import type { Modality } from "@/lib/db/types";

// Auth state comes from runtime env, not build time.
export const dynamic = "force-dynamic";

const SPORTS: Modality[] = ["run", "bike", "swim", "lift", "core"];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!authEnabled()) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-screen bg-nav">
      {/* Small screens: full-bleed hero behind the form (desktop uses the right column). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/login-hero.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover lg:hidden"
      />
      <div className="absolute inset-0 bg-nav/75 lg:hidden" />

      {/* Left: sign-in form */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 lg:w-[440px] lg:flex-none">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-wordmark.png"
              alt="TrainingGeeks"
              className="mx-auto h-24 w-auto"
            />
            <p className="mt-1 text-xs text-white/50">Your self-hosted training log</p>
          </div>
          <div className="rounded border border-white/10 bg-surface-card p-6 shadow-lg">
            <form action={loginAction} className="space-y-3">
              <label className="block text-sm font-medium text-ink" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoFocus
                autoComplete="current-password"
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent"
              />
              {error && <p className="text-sm text-fatigue">Incorrect password.</p>}
              <button
                type="submit"
                className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Sign in
              </button>
            </form>
          </div>

          {/* Supported disciplines */}
          <div className="mt-7">
            <p className="text-center text-[11px] uppercase tracking-wide text-white/40">
              Track every discipline
            </p>
            <div className="mt-2.5 flex justify-center gap-2">
              {SPORTS.map((m) => (
                <div
                  key={m}
                  title={MODALITY_LABEL[m]}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 shadow-sm"
                >
                  <SportImage modality={m} size={22} />
                </div>
              ))}
            </div>
          </div>

          {/* intervals.icu sync */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-white/50">
            <span>Syncs with</span>
            <a
              href="https://intervals.icu"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded bg-white px-2 py-1 shadow-sm hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/intervals-wordmark.png" alt="intervals.icu" className="h-3.5 w-auto" />
            </a>
          </div>
        </div>
      </div>

      {/* Right: hero photo (hidden on small screens) */}
      <div className="relative hidden flex-1 lg:block">
        <img
          src="/login-hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-nav via-nav/40 to-transparent" />
        <div className="absolute bottom-10 left-10 max-w-md">
          <p className="text-2xl font-semibold leading-snug text-white drop-shadow">
            Train with purpose.
          </p>
          <p className="mt-1 text-sm text-white/70 drop-shadow">
            Every workout, metric, and trend — in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
