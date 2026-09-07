"use client";

import { useRef, useState } from "react";
import type { RestoreResult } from "@/lib/backup/service";

type Stage = "idle" | "confirm" | "busy" | "done";

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupRestore() {
  const picker = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<RestoreResult | null>(null);

  function reset() {
    setFile(null);
    setStage("idle");
    setResult(null);
    if (picker.current) picker.current.value = "";
  }

  async function restore() {
    if (!file) return;
    setStage("busy");
    setResult(null);
    try {
      const res = await fetch("/api/backup/restore", { method: "POST", body: file });
      setResult((await res.json()) as RestoreResult);
    } catch (err) {
      setResult({ ok: false, error: (err as Error).message });
    } finally {
      setStage("done");
      if (picker.current) picker.current.value = "";
      setFile(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 border-b border-line pb-1 text-lg text-ink">Backup &amp; Restore</h2>

      <h3 className="text-sm font-bold text-ink">Download a backup</h3>
      <p className="mb-2 mt-1 text-sm text-ink-muted">
        One <code>.tar.gz</code> holding a consistent snapshot of the database,
        every photo and attachment under <code>data/uploads</code>, and every
        original FIT file under <code>data/fit/raw</code>. Large libraries take a
        moment to pack.
      </p>
      <a
        href="/api/backup"
        download
        className="inline-block rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Download backup
      </a>

      <h3 className="mt-6 text-sm font-bold text-ink">Restore from a backup</h3>
      <p className="mb-2 mt-1 text-sm text-ink-muted">
        The archive is verified before anything is replaced. The current
        database is kept, timestamped, next to the live one — restoring never
        deletes it. Photos and FIT files are merged in; files with the same name
        are overwritten.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={picker}
          type="file"
          accept=".gz,.tgz,application/gzip,application/x-gzip"
          disabled={stage === "busy"}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setStage("idle");
            setResult(null);
          }}
          className="text-sm text-ink file:mr-3 file:rounded file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:border-accent"
        />
        {file && stage === "idle" && (
          <button
            onClick={() => setStage("confirm")}
            className="rounded border border-accent px-3 py-2 text-sm font-medium text-accent hover:bg-accent/5"
          >
            Restore from this file
          </button>
        )}
      </div>

      {file && stage === "confirm" && (
        <div className="mt-3 rounded border border-fatigue/40 bg-fatigue/5 p-3">
          <p className="text-sm font-bold text-ink">
            Replace all training data with this backup?
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {file.name} · {mb(file.size)}
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">
            <li>The archive is checked first — a bad file changes nothing.</li>
            <li>Your current database is moved aside with a timestamp, not deleted.</li>
            <li>TrainingGeeks must be restarted afterwards to load the restored data.</li>
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={restore}
              className="rounded bg-fatigue px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Yes, restore this backup
            </button>
            <button
              onClick={reset}
              className="rounded border border-line px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {stage === "busy" && (
        <p className="mt-3 text-sm text-ink-muted">Verifying and restoring…</p>
      )}

      {result && !result.ok && (
        <p className="mt-3 rounded border border-fatigue/40 bg-fatigue/5 px-3 py-2 text-sm text-fatigue">
          Restore failed — nothing was changed. {result.error}
        </p>
      )}

      {result?.ok && (
        <div className="mt-3 rounded border border-line bg-surface p-3 text-sm">
          <p className="font-bold text-ink">
            Restored the backup taken{" "}
            {result.createdAt ? new Date(result.createdAt).toLocaleString() : "earlier"}.
          </p>
          <p className="mt-1 text-ink-muted">
            {result.files ?? 0} file{result.files === 1 ? "" : "s"} restored. The previous
            database was saved as <code>{result.movedTo}</code>.
          </p>
          {result.filesError && (
            <p className="mt-1 font-medium text-fatigue">
              The database was restored, but its photos and FIT files could not all be
              copied: {result.filesError}
            </p>
          )}
          <p className="mt-1 font-medium text-ink">
            Restart TrainingGeeks now — the running process still holds the old database.
          </p>
        </div>
      )}
    </div>
  );
}
