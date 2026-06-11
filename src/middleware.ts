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

  // Read-only/demo: serve reads publicly, block every write, hide Settings.
  if (isReadOnly()) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new NextResponse("This is a read-only demo.", { status: 403 });
    }
    if (pathname === "/settings" || pathname.startsWith("/settings/")) {
      const url = req.nextUrl.clone();
      url.pathname = "/home";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // The landing IS the demo's front door: serve it at the bare root, and
    // move the athlete home to /home so the demo's "/" can't be mistaken for
    // a personal instance. Old ?enter=1 links land on the app home.
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      if (req.nextUrl.searchParams.has("enter")) {
        url.pathname = "/home";
        url.search = "";
        return NextResponse.redirect(url);
      }
      url.pathname = "/login";
      return NextResponse.rewrite(url);
    }
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
