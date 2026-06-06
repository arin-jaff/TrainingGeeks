import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authEnabled, getSecret } from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
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
  // Protect everything except the login page, Next internals, and static files.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico)$).*)"],
};
