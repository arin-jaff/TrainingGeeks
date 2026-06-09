import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { deleteActivityFile, getActivityFile } from "@/lib/db/repo";
import { removeFile } from "@/lib/files/storage";

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

  const download = new URL(req.url).searchParams.has("download");
  const disposition = download ? "attachment" : "inline";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": f.mime,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(f.filename)}"`,
      "Cache-Control": "private, max-age=3600",
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
