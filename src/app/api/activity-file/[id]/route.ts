import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { deleteActivityFile, getActivityFile } from "@/lib/db/repo";
import { removeFile } from "@/lib/files/storage";
import { downscaleImage } from "@/lib/files/thumb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stream a stored attachment. `?download=1` forces a download; otherwise images
// render inline (so the calendar thumbnail / preview can use this URL directly).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const f = getActivityFile(db, Number(id));
  if (!f) return new NextResponse("Not found", { status: 404 });

  let bytes: Buffer;
  try {
    bytes = readFileSync(f.stored_path);
  } catch {
    return new NextResponse("File missing on disk", { status: 410 });
  }

  const search = new URL(req.url).searchParams;
  const download = search.has("download");

  // ?w=<px>: serve a downscaled rendition (feed/thumbnail use). Images only.
  const w = Number(search.get("w"));
  let mime = f.mime;
  if (!download && f.is_image === 1 && Number.isFinite(w) && w > 0) {
    const scaled = await downscaleImage(bytes, f.mime, Math.min(w, 2000));
    bytes = scaled.data;
    mime = scaled.mime;
  }

  const disposition = download ? "attachment" : "inline";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(f.filename)}"`,
      "Cache-Control": "private, max-age=86400",
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const f = getActivityFile(db, Number(id));
  if (!f) return NextResponse.json({ ok: true });
  removeFile(f.stored_path);
  deleteActivityFile(db, f.id);
  revalidatePath("/calendar");
  revalidatePath(`/activity/${f.activity_id}`);
  return NextResponse.json({ ok: true });
}
