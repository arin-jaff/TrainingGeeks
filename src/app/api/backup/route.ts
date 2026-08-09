import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { isReadOnly } from "@/lib/auth/config";
import { cleanup, createBackup } from "@/lib/backup/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download one archive with the database snapshot, the uploaded attachments and
 * every stored raw FIT. Blocked in read-only mode: the demo serves reads, but a
 * full database dump would hand over private notes with them.
 */
export async function GET() {
  if (isReadOnly()) return new NextResponse("This is a read-only demo.", { status: 403 });

  const archive = createBackup();
  const file = createReadStream(archive.path);
  file.on("close", () => cleanup(archive.stage));

  return new NextResponse(Readable.toWeb(file) as unknown as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Length": String(archive.bytes),
      "Content-Disposition": `attachment; filename="${archive.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
