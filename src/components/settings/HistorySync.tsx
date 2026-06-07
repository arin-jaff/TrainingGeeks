"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SyncResult } from "@/lib/connectors/intervals";

function oneYearAgo(): string {
  // Pure string math to avoid Date() drift; default to ~1 year back.
  const now = new Date();
  const y = now.getUTCFullYear() - 1;
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function HistorySync() {
  const router = useRouter();
  const [since, setSince] = useState(oneYearAgo());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function run() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/sync?since=${since}`, { method: "POST" });
      setResult((await res.json()) as SyncResult);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">Historical sync</p>
      <p className="mb-2 text-xs text-ink-muted">
        Backfill every activity since a date. Re-running is safe (duplicates are
        skipped); a multi-year range may take a while.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          className="rounded border border-line px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={run}
          disabled={busy}
          className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Syncing…" : "Sync history"}
        </button>
      </div>
      {result && (
        <p className="mt-2 text-sm text-ink-muted">
          {result.errors.length
            ? `Errors: ${result.errors.join("; ")}`
            : `Imported ${result.imported}, ${result.duplicates} already present, ${result.planned} planned.`}
        </p>
      )}
    </div>
  );
}
