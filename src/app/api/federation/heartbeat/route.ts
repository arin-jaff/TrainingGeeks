import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { directoryUrl } from "@/lib/federation/config";
import { getHandle, getSigner } from "@/lib/federation/keystore";
import { heartbeat } from "@/lib/federation/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Presence heartbeat, called periodically by a local timer (authenticated with
 * the same bearer token as /api/sync — see middleware). Sends a signed
 * heartbeat to the directory so friends see this instance as online without
 * anyone opening the Social tab. No-ops when federation isn't configured.
 */
export async function POST() {
  const url = directoryUrl();
  if (!url) return NextResponse.json({ skipped: "no directory configured" });

  const db = getDb();
  if (!getHandle(db)) return NextResponse.json({ skipped: "not registered" });

  try {
    const res = await heartbeat(getSigner(db), url);
    return NextResponse.json({ ok: true, lastSeen: res.lastSeen });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
