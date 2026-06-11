import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getActivityFile } from "@/lib/db/repo";
import { verifyPeer, scopesSharedWith } from "@/lib/federation/peer";
import { downscaleImage } from "@/lib/files/thumb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Peer image read: a friend's instance fetches one activity image, downscaled
 * for their feed. Same Ed25519 signature + directory authz as the scope API;
 * granted to anyone we share "activities" with (the scope whose payload
 * carries the image ids). Bytes never go through the directory.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const callerKey = verifyPeer({
    key: req.headers.get("X-TG-Key") ?? undefined,
    timestamp: req.headers.get("X-TG-Timestamp") ?? undefined,
    signature: req.headers.get("X-TG-Signature") ?? undefined,
    method: "GET",
    path: new URL(req.url).pathname,
    body: "",
  });
  if (!callerKey) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  const db = getDb();
  const granted = await scopesSharedWith(db, callerKey);
  if (!granted.includes("activities"))
    return NextResponse.json({ error: "not shared with you" }, { status: 403 });

  const f = getActivityFile(db, Number(id));
  if (!f || f.is_image !== 1)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = readFileSync(f.stored_path);
  } catch {
    return NextResponse.json({ error: "file missing" }, { status: 410 });
  }

  const scaled = await downscaleImage(bytes, f.mime);
  return new NextResponse(new Uint8Array(scaled.data), {
    headers: {
      "Content-Type": scaled.mime,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
