import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { verifyPeer, scopesSharedWith } from "@/lib/federation/peer";
import { buildSharedPayload, isScope } from "@/lib/federation/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Peer read API. Another instance fetches a scope of this athlete's shared data
 * by signing the request with its Ed25519 key. We verify the signature, then
 * confirm (via the directory) that the caller is a friend we've granted that
 * scope. Returns only the requested, opted-in scope — never private notes.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ scope: string }> },
) {
  const { scope } = await params;
  if (!isScope(scope)) return NextResponse.json({ error: "unknown scope" }, { status: 404 });

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
  if (!granted.includes(scope))
    return NextResponse.json({ error: "not shared with you" }, { status: 403 });

  return NextResponse.json(buildSharedPayload(db, scope));
}
