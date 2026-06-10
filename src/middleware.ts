import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  authEnabled,
  getSecret,
  getSyncToken,
} from "@/lib/auth/config";
import { timingSafeEqual, verifySessionToken } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  // Local daemons (sync, federation heartbeat) authenticate with a bearer token.
  const pathname = req.nextUrl.pathname;
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
