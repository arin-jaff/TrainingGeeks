import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  authEnabled,
  getSecret,
  getSyncToken,
  isReadOnly,
} from "@/lib/auth/config";
import { timingSafeEqual, verifySessionToken } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Local daemons (sync, federation heartbeat) authenticate with a bearer token
  // (allowed even in read-only mode so a hosted demo keeps updating).
  if (pathname === "/api/sync" || pathname === "/api/federation/heartbeat") {
    const token = getSyncToken();
    const header = req.headers.get("authorization") ?? "";
    if (token && timingSafeEqual(header, `Bearer ${token}`)) {
      return NextResponse.next();
    }
  }

  // The federation read API is called by peer instances and authenticates
  // itself with an Ed25519 signature inside the route — not a session.
  if (pathname.startsWith("/api/federation/v1/")) {
    return NextResponse.next();
  }

  // Liveness probe and the desktop-download redirect: public by design
  // (no data, no DB) — the landing page links them for anonymous visitors.
  if (pathname === "/api/health" || pathname === "/api/download/macos") {
    return NextResponse.next();
  }

  // Read-only/demo: serve reads publicly, block every write, hide Settings.
  if (isReadOnly()) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new NextResponse("This is a read-only demo.", { status: 403 });
    }
    if (pathname === "/settings" || pathname.startsWith("/settings/")) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // Hostname split: the demo host serves the app directly ("/" IS the
    // athlete home), while the marketing landing lives on TG_LANDING_HOST
    // (e.g. the bare traininggeeks.net), whose root rewrites to the landing.
    const landingHost = process.env.TG_LANDING_HOST?.toLowerCase();
    const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
    if (pathname === "/" && landingHost && host === landingHost) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.rewrite(url);
    }
    // Legacy paths from the old front-door flow keep working.
    if (pathname === "/home") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (!authEnabled()) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionToken(token, getSecret());
  if (valid) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Protect everything except the login/privacy pages, Next internals, and static
  // files. Public tokens are segment-anchored so e.g. /login-data isn't excluded.
  matcher: ["/((?!login(?:$|/)|privacy(?:$|/)|calendar\\.ics(?:$|/)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)"],
};
