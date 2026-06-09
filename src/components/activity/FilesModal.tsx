"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listActivityFilesAction,
  type ActivityFileView,
} from "@/app/actions/files";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesModal({
  activityId,
  onClose,
}: {
  activityId: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ActivityFileView[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const list = await listActivityFilesAction(activityId);
    setFiles(list);
    setSelected((cur) => cur ?? list[0]?.id ?? null);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  async function upload(chosen: FileList | null) {
    if (!chosen || chosen.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("activityId", String(activityId));
      for (const f of Array.from(chosen)) fd.append("files", f);
      const res = await fetch("/api/activity-file", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      await refresh();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    if (selected == null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/activity-file/${selected}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSelected(null);
      await refresh();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="my-10 w-full max-w-md rounded-lg bg-surface-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <h2 className="text-sm font-semibold text-ink">Upload Files</h2>
          <button
            onClick={onClose}
            className="text-xl leading-none text-ink-muted hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-ink-muted">Select a file from your computer</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-1.5 w-full rounded border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {busy ? "Working…" : "Browse Files"}
        </button>
        <p className="mt-1.5 text-[11px] text-ink-muted">
          Images preview as a thumbnail on the calendar. Up to 25&nbsp;MB each.
        </p>

        {error && <p className="mt-2 text-xs text-fatigue">{error}</p>}

        <p className="mt-4 text-xs font-medium text-ink">Uploaded Files</p>
        <div className="mt-1 max-h-48 overflow-y-auto rounded border border-line">
          {files.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-ink-muted">
              No files uploaded yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {files.map((f) => (
                <li key={f.id}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-surface">
                    <input
                      type="radio"
                      name="file"
                      checked={selected === f.id}
                      onChange={() => setSelected(f.id)}
                      className="accent-accent"
                    />
                    {f.isImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/activity-file/${f.id}`}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded object-cover"
                      />
                    )}
                    <a
                      href={`/api/activity-file/${f.id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-accent hover:underline"
                    >
                      {f.filename}
                    </a>
                    <span className="shrink-0 text-[11px] text-ink-muted">
                      {fmtSize(f.size)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={remove}
            disabled={busy || selected == null}
            className="rounded border border-line px-3 py-1.5 text-sm text-ink-muted hover:border-fatigue hover:text-fatigue disabled:opacity-40"
          >
            Delete
          </button>
          <a
            href={selected != null ? `/api/activity-file/${selected}?download=1` : undefined}
            aria-disabled={selected == null}
            className={`rounded border border-line px-3 py-1.5 text-sm ${
              selected == null
                ? "pointer-events-none opacity-40"
                : "text-ink hover:border-accent hover:text-accent"
            }`}
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
