"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ResultRow {
  file: string;
  status: string;
  modality?: string;
  error?: string;
}

export default function FileUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setResults([]);
    const form = new FormData();
    for (const f of Array.from(files)) form.append("files", f);
    try {
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      setResults(data.results ?? []);
      router.refresh();
    } catch {
      setResults([{ file: "upload", status: "error", error: "Request failed" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={[
          "flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-accent bg-accent/5" : "border-line bg-surface-card",
        ].join(" ")}
      >
        <p className="text-sm font-medium text-ink">
          {busy ? "Importing…" : "Drop FIT files here, or click to choose"}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Supports .fit and .fit.gz exports
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".fit,.gz,application/octet-stream"
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
      </div>

      {results.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded border border-line bg-surface-card text-sm">
          {results.map((r, i) => (
            <li key={i} className="flex items-center justify-between px-3 py-2">
              <span className="truncate text-ink">{r.file}</span>
              <span
                className={
                  r.status === "imported"
                    ? "text-modality-run"
                    : r.status === "duplicate"
                      ? "text-ink-muted"
                      : "text-fatigue"
                }
              >
                {r.status}
                {r.modality ? ` · ${r.modality}` : ""}
                {r.error ? ` · ${r.error}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
