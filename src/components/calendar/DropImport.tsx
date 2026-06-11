"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ResultRow {
  file: string;
  status: string;
  error?: string;
}

/**
 * Calendar-wide FIT drop zone: drag activity files anywhere over the calendar
 * to import them through the same pipeline as the Import page. Only reacts to
 * real file drags (dnd-kit card drags carry no Files type), summarizes the
 * outcome in a toast, and refreshes the calendar.
 */
export default function DropImport({
  readOnly,
  children,
}: {
  readOnly: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const depth = useRef(0);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (readOnly) return <>{children}</>;

  const hasFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes("Files");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 6000);
  };

  async function onDrop(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current = 0;
    setOver(false);

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      /\.fit(\.gz)?$/i.test(f.name),
    );
    if (files.length === 0) {
      showToast("Drop .fit or .fit.gz files to import.");
      return;
    }

    setBusy(true);
    const form = new FormData();
    for (const f of files) form.append("files", f);
    try {
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = (await res.json()) as { results?: ResultRow[] };
      const rows = data.results ?? [];
      const ok = rows.filter((r) => r.status === "imported").length;
      const dup = rows.filter((r) => r.status === "duplicate").length;
      const err = rows.length - ok - dup;
      showToast(
        [
          `${ok} imported`,
          dup > 0 ? `${dup} duplicate${dup > 1 ? "s" : ""}` : null,
          err > 0 ? `${err} failed` : null,
        ]
          .filter(Boolean)
          .join(", "),
      );
      router.refresh();
    } catch {
      showToast("Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="relative"
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => {
        if (hasFiles(e)) e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (!hasFiles(e)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={onDrop}
    >
      {children}

      {(over || busy) && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded border-2 border-dashed border-accent bg-accent/5">
          <span className="rounded bg-surface-card px-4 py-2 text-sm font-semibold text-accent shadow">
            {busy ? "Importing…" : "Drop to import FIT files"}
          </span>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded bg-nav px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
