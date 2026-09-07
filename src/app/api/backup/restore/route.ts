import { mkdtempSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { isReadOnly } from "@/lib/auth/config";
import { MAX_ARCHIVE_BYTES } from "@/lib/backup/archive";
import { cleanup, restoreBackup } from "@/lib/backup/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT_LABEL = `${MAX_ARCHIVE_BYTES / 1024 ** 3} GB`;

/** Stop reading the upload the moment it goes over the cap. */
async function* capped(body: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
  let seen = 0;
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    seen += chunk.byteLength;
    if (seen > MAX_ARCHIVE_BYTES) throw new Error(`Backup exceeds the ${LIMIT_LABEL} limit.`);
    yield chunk;
  }
}

/**
 * Restore from an uploaded archive (POST the .tar.gz as the raw request body).
 * The file is verified before anything on disk changes; see restoreBackup.
 */
export async function POST(req: Request) {
  if (isReadOnly()) {
    return NextResponse.json({ ok: false, error: "This is a read-only demo." }, { status: 403 });
  }
  if (!req.body) {
    return NextResponse.json({ ok: false, error: "No file uploaded." }, { status: 400 });
  }
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_ARCHIVE_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Backup exceeds the ${LIMIT_LABEL} limit.` },
      { status: 413 },
    );
  }

  const dir = mkdtempSync(join(tmpdir(), "tg-restore-upload-"));
  const upload = join(dir, "backup.tar.gz");
  try {
    await writeFile(upload, capped(req.body));
  } catch (err) {
    cleanup(dir);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 413 });
  }

  try {
    const result = restoreBackup(upload);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  } finally {
    cleanup(dir);
  }
}
