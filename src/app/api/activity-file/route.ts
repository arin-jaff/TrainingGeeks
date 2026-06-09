import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getActivity, insertActivityFile } from "@/lib/db/repo";
import { isImageMime, saveActivityFile } from "@/lib/files/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES = 20;
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  const form = await req.formData();
  const activityId = Number(form.get("activityId"));
  if (!Number.isInteger(activityId)) {
    return NextResponse.json({ error: "Missing activityId" }, { status: 400 });
  }

  const db = getDb();
  if (!getActivity(db, activityId)) {
    return NextResponse.json({ error: "Unknown activity" }, { status: 404 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0)
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  if (files.length > MAX_FILES)
    return NextResponse.json({ error: `Too many files (max ${MAX_FILES})` }, { status: 413 });
  if (files.some((f) => f.size > MAX_FILE_BYTES))
    return NextResponse.json({ error: "A file exceeds the 25 MB limit" }, { status: 413 });

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = file.type || "application/octet-stream";
    const path = saveActivityFile(activityId, randomUUID().slice(0, 8), file.name, bytes);
    insertActivityFile(db, {
      activity_id: activityId,
      filename: file.name,
      mime,
      size: file.size,
      stored_path: path,
      is_image: isImageMime(mime) ? 1 : 0,
    });
  }

  revalidatePath("/calendar");
  revalidatePath(`/activity/${activityId}`);
  return NextResponse.json({ ok: true, uploaded: files.length });
}
