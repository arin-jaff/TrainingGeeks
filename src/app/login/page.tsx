import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { authEnabled } from "@/lib/auth/config";

// Auth state comes from runtime env, not build time.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!authEnabled()) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-nav px-4">
      <div className="w-full max-w-sm rounded border border-line bg-surface-card p-6 shadow-sm">
        <div className="mb-5 text-center">
          <span className="text-lg font-bold tracking-tight text-ink">
            TRAINING<span className="text-accent">GEEKS</span>
          </span>
        </div>
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
          {error && (
            <p className="text-sm text-fatigue">Incorrect password.</p>
          )}
          <button
            type="submit"
            className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
