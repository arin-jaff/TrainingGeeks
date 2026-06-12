import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RELEASES_API =
  "https://api.github.com/repos/arin-jaff/TrainingGeeks/releases?per_page=20";
const RELEASES_PAGE = "https://github.com/arin-jaff/TrainingGeeks/releases";

// Resolved asset URL, cached so the landing page never rate-limits GitHub
// (60 unauthenticated calls/hr) and downloads stay instant.
let cached: { url: string; at: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;

/**
 * Always-latest macOS download: desktop builds are GitHub *pre*-releases, so
 * the /releases/latest/download shortcut never resolves them. This looks up
 * the newest release with a dmg asset and redirects straight to the file;
 * any failure falls back to the releases page.
 */
export async function GET() {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.redirect(cached.url, 302);
  }
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const releases = (await res.json()) as {
        assets: { name: string; browser_download_url: string }[];
      }[];
      for (const r of releases) {
        const dmg = r.assets?.find((a) => a.name.endsWith(".dmg"));
        if (dmg) {
          cached = { url: dmg.browser_download_url, at: Date.now() };
          return NextResponse.redirect(dmg.browser_download_url, 302);
        }
      }
    }
  } catch {
    // fall through to the releases page
  }
  return NextResponse.redirect(RELEASES_PAGE, 302);
}
