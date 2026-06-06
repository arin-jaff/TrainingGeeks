"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SyncResult } from "@/lib/connectors/intervals";

export default function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function sync() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      setResult((await res.json()) as SyncResult);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={sync}
        disabled={busy}
        className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync now"}
      </button>
      {result && (
        <p className="mt-2 text-sm text-ink-muted">
          {result.errors.length
            ? `Errors: ${result.errors.join("; ")}`
            : `Imported ${result.imported}, ${result.duplicates} already present, ${result.planned} planned workouts.`}
        </p>
      )}
    </div>
  );
}
