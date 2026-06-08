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

  // The sync daemon authenticates to /api/sync with a bearer token (allowed
  // even in read-only mode so a hosted demo keeps updating).
  if (pathname === "/api/sync") {
    const token = getSyncToken();
    const header = req.headers.get("authorization") ?? "";
    if (token && timingSafeEqual(header, `Bearer ${token}`)) {
      return NextResponse.next();
    }
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
