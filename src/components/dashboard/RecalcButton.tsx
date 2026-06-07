"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recalcMetrics } from "@/app/actions/dashboard";

export default function RecalcButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<number | null>(null);

  return (
    <button
      onClick={() =>
        start(async () => {
          const r = await recalcMetrics();
          setDone(r.count);
          router.refresh();
        })
      }
      disabled={pending}
      title="Recompute metrics and fitness from your activities"
      className="flex items-center gap-1.5 rounded border border-line bg-surface-card px-3 py-1.5 text-[11px] font-medium text-ink-muted hover:border-accent hover:text-accent disabled:opacity-50"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={pending ? "animate-spin" : ""}
      >
        <path d="M21 12a9 9 0 11-3-6.7L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
      {pending ? "Recalculating…" : done != null ? `Recalculated ${done}` : "Recalculate"}
    </button>
  );
}
