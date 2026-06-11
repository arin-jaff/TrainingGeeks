import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { directoryUrl } from "@/lib/federation/config";
import { getSigner } from "@/lib/federation/keystore";
import { fetchPeerImage, resolve } from "@/lib/federation/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Browser-facing proxy for a friend's feed image. The browser can't sign
 * Ed25519 requests, so this instance fetches the (already downscaled) image
 * from the friend's instance with its own key and streams it through. A GET,
 * so feed images render on the read-only demo too.
 */
export async function GET(req: NextRequest) {
  const url = directoryUrl();
  if (!url) return NextResponse.json({ error: "No directory configured." }, { status: 400 });

  const handle = req.nextUrl.searchParams.get("handle");
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!handle || !Number.isInteger(id) || id <= 0)
    return NextResponse.json({ error: "handle and id are required" }, { status: 400 });

  const db = getDb();
  try {
    const peer = await resolve(getSigner(db), url, handle);
    const img = await fetchPeerImage(getSigner(db), peer.url, id);
    return new NextResponse(img.data, {
      headers: {
        "Content-Type": img.mime,
        // Long-lived: attachments are immutable once uploaded.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
