import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getSharedActivity, shareSummary } from "@/lib/queries/share";
import { MODALITY_LABEL } from "@/lib/util/format";
import SharedActivityView from "@/components/share/SharedActivityView";

// Token lookup happens per request; nothing here may be prerendered or cached.
export const dynamic = "force-dynamic";

/** Absolute origin of this request, so OG tags carry a fetchable image URL. */
async function origin(): Promise<string | undefined> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return undefined;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const shared = getSharedActivity(getDb(), token);
  // Share links are unlisted, never indexed — including the 404 case.
  const robots = { index: false, follow: false };
  if (!shared) return { title: "TrainingGeeks", robots };

  const title = `${shared.name ?? MODALITY_LABEL[shared.modality]} — TrainingGeeks`;
  const description = shareSummary(shared);
  const base = await origin();
  const image = "/logo-wordmark.png";
  return {
    title,
    description,
    robots,
    metadataBase: base ? new URL(base) : undefined,
    openGraph: {
      type: "article",
      siteName: "TrainingGeeks",
      title,
      description,
      images: [{ url: image, width: 804, height: 354, alt: "TrainingGeeks" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/**
 * Public, read-only page for a single shared activity. Reachable without a
 * session (see the `share/` exemption in src/middleware.ts) — so it renders
 * only the allow-listed `SharedActivity` and links nowhere into the app.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shared = getSharedActivity(getDb(), token);
  if (!shared) notFound(); // unknown or revoked

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="bg-nav">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark.png" alt="TrainingGeeks" className="h-9 w-auto" />
          <span className="text-xs uppercase tracking-wide text-white/50">
            Shared activity
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-5">
        <SharedActivityView shared={shared} />
      </main>

      <footer className="mx-auto w-full max-w-[1100px] border-t border-line px-4 py-5 text-xs text-ink-muted">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            Shared read-only from a self-hosted TrainingGeeks instance. The owner can revoke
            this link at any time.
          </span>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
