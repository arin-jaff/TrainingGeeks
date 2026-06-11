import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness probe — no auth, no DB. The desktop shell polls this to know the
 * embedded server is ready; ops can point uptime checks at it too.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "traininggeeks",
    uptimeS: Math.round(process.uptime()),
  });
}
