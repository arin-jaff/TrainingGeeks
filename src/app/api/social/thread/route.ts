import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { directoryUrl } from "@/lib/federation/config";
import { getSigner } from "@/lib/federation/keystore";
import { fetchActivitySocial } from "@/lib/federation/client";

export const dynamic = "force-dynamic";

/**
 * Read the kudos list + comment thread for one feed activity. A GET (not a
 * server action) so threads stay viewable on the read-only demo, where all
 * POSTs are blocked.
 */
export async function GET(req: NextRequest) {
  const url = directoryUrl();
  if (!url) return NextResponse.json({ error: "No directory configured." }, { status: 400 });

  const handle = req.nextUrl.searchParams.get("handle");
  const ref = req.nextUrl.searchParams.get("ref");
  if (!handle || !ref)
    return NextResponse.json({ error: "handle and ref are required" }, { status: 400 });

  try {
    const thread = await fetchActivitySocial(getSigner(getDb()), url, handle, ref);
    return NextResponse.json(thread);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
