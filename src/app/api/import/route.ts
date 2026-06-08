import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { importFitBuffer } from "@/lib/import/service";
import { recomputeFitness } from "@/lib/fitness/recompute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES = 50;
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per FIT file is already generous

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Too many files (max ${MAX_FILES})` }, { status: 413 });
  }
  if (files.some((f) => f.size > MAX_FILE_BYTES)) {
    return NextResponse.json({ error: "A file exceeds the 25 MB limit" }, { status: 413 });
  }

  const db = getDb();
  const results: {
    file: string;
    status: string;
    modality?: string;
    error?: string;
  }[] = [];

  for (const file of files) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      // Defer the (expensive) fitness recompute until all files are imported.
      const r = importFitBuffer(db, bytes, "manual", { recompute: false });
      results.push({ file: file.name, status: r.status, modality: r.modality });
    } catch (err) {
      results.push({
        file: file.name,
        status: "error",
        error: (err as Error).message,
      });
    }
  }

  recomputeFitness(db);
  const imported = results.filter((r) => r.status === "imported").length;
  return NextResponse.json({ imported, results });
}
