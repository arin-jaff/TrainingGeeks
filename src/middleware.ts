import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  authEnabled,
  getSecret,
  getSyncToken,
} from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  // The sync daemon authenticates to /api/sync with a bearer token.
  if (req.nextUrl.pathname === "/api/sync") {
    const token = getSyncToken();
    if (token && req.headers.get("authorization") === `Bearer ${token}`) {
      return NextResponse.next();
    }
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
  // Protect everything except the login/privacy pages, Next internals, and static files.
  matcher: ["/((?!login|privacy|calendar.ics|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico)$).*)"],
};
