import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { countNewSocial } from "@/lib/federation/feedServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Count of friend activities since the feed was last opened (nav badge). */
export async function GET() {
  try {
    return NextResponse.json({ count: await countNewSocial(getDb()) });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
