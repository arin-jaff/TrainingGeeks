"use client";

import { useState } from "react";
import {
  createActivityShareLink,
  revokeActivityShareLink,
} from "@/app/actions/share";
import { useReadOnly } from "@/components/ReadOnly";

/**
 * "Share" control on the activity page: mints an unguessable public link for
 * this one activity, shows it with a copy control, and revokes it. Hidden in
 * read-only/demo mode, where minting is blocked anyway.
 */
export default function ShareButton({
  activityId,
  initialToken,
}: {
  activityId: number;
  initialToken: string | null;
}) {
  const readOnly = useReadOnly();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (readOnly) return null;

  const url = token ? `${typeof window === "undefined" ? "" : window.location.origin}/share/${token}` : "";

  async function create() {
    setBusy(true);
    setToken(await createActivityShareLink(activityId));
    setBusy(false);
  }

  async function revoke() {
    setBusy(true);
    await revokeActivityShareLink(activityId);
    setToken(null);
    setCopied(false);
    setBusy(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-medium",
          token
            ? "border-accent text-accent"
            : "border-line text-ink hover:border-accent hover:text-accent",
        ].join(" ")}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        Share
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded border border-line bg-surface-card p-3 shadow-lg">
          {token ? (
            <>
              <p className="mb-2 text-xs text-ink-muted">
                Anyone with this link can view this activity — no sign-in, nothing else from
                your log.
              </p>
              <div className="flex gap-1.5">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
                />
                <button
                  onClick={copy}
                  className="rounded bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                onClick={revoke}
                disabled={busy}
                className="mt-2 text-xs font-medium text-ink-muted hover:text-fatigue disabled:opacity-50"
              >
                Revoke link
              </button>
            </>
          ) : (
            <>
              <p className="mb-2 text-xs text-ink-muted">
                This activity is private. Create a link to share just this one activity —
                revoke it any time.
              </p>
              <button
                onClick={create}
                disabled={busy}
                className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create public link"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
