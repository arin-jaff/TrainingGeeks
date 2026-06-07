"use client";

import { useEffect, useState } from "react";

const input = "rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent";

export default function ExportData() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);
  const icsUrl = `${origin}/calendar.ics`;

  function exportCsv() {
    const qs = new URLSearchParams();
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) qs.set("from", from);
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) qs.set("to", to);
    window.location.href = `/api/export?${qs.toString()}`;
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 border-b border-line pb-1 text-lg text-ink">Export Data</h2>

      <h3 className="text-sm font-bold text-ink">Download activities (CSV)</h3>
      <p className="mb-2 mt-1 text-sm text-ink-muted">
        Exports date, sport, duration, distance and all metrics. Original FIT
        files are also stored locally under <code>data/fit</code>.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-ink">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${input} mt-1 block`} />
        </label>
        <label className="text-sm text-ink">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${input} mt-1 block`} />
        </label>
        <button
          onClick={exportCsv}
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Export CSV
        </button>
      </div>

      <h3 className="mt-6 text-sm font-bold text-ink">Calendar feed (.ics)</h3>
      <p className="mb-2 mt-1 text-sm text-ink-muted">
        Subscribe in Apple/Google Calendar to see your completed workouts (date,
        time, duration and a brief summary). If you set a password, append{" "}
        <code>?token=&lt;your TG_SYNC_TOKEN&gt;</code>.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input readOnly value={icsUrl} className={`${input} w-80`} />
        <button
          onClick={() => {
            navigator.clipboard?.writeText(icsUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded border border-accent px-3 py-2 text-sm font-medium text-accent hover:bg-accent/5"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={icsUrl}
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Download .ics
        </a>
      </div>
    </div>
  );
}
