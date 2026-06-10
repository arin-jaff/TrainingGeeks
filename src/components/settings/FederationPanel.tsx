"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getFederationStatus,
  registerHandle,
  respondToFriend,
  sendFriendRequest,
  type FederationStatus,
} from "@/app/actions/federation";

const SCOPES = ["calendar", "pmc", "activities", "peaks"] as const;
const input =
  "w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-accent";

function PresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: online ? "#45ae01" : "#cbd2dc" }}
      title={online ? "Online" : "Offline"}
      aria-label={online ? "Online" : "Offline"}
    />
  );
}

function ScopePicker({
  value,
  onChange,
}: {
  value: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {SCOPES.map((s) => (
        <label key={s} className="flex items-center gap-1.5 text-xs text-ink">
          <input
            type="checkbox"
            checked={value.has(s)}
            onChange={(e) => {
              const next = new Set(value);
              if (e.target.checked) next.add(s);
              else next.delete(s);
              onChange(next);
            }}
            className="accent-accent"
          />
          {s}
        </label>
      ))}
    </div>
  );
}

export default function FederationPanel() {
  const [status, setStatus] = useState<FederationStatus | null>(null);
  const [, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () => getFederationStatus().then(setStatus);
  useEffect(() => {
    refresh();
  }, []);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      if (!r.ok) setMsg(r.error ?? "Something went wrong.");
      await refresh();
    });

  if (!status) return <p className="text-sm text-ink-muted">Loading…</p>;

  // 1) No directory configured.
  if (!status.enabled) {
    return (
      <div className="max-w-prose space-y-3 text-sm text-ink-muted">
        <p>
          Federation lets you add friends on other self-hosted TrainingGeeks
          instances and share training data — your data stays on your box.
        </p>
        <p>
          It&apos;s off because no directory is configured. Set{" "}
          <code className="rounded bg-surface px-1">TG_DIRECTORY_URL</code> to a
          coordination server (see the{" "}
          <a
            href="https://github.com/arin-jaff/TrainingGeeks-Directory"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            TrainingGeeks-Directory
          </a>{" "}
          project) and restart.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {msg && <p className="rounded border border-fatigue/40 bg-fatigue/5 px-3 py-2 text-sm text-fatigue">{msg}</p>}
      {status.error && (
        <p className="rounded border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
          Directory: {status.error}
        </p>
      )}

      {/* 2) Not registered yet → claim a handle. */}
      {!status.handle ? (
        <RegisterForm needsUrl={!status.publicUrl} onRegister={run} />
      ) : (
        <>
          <Identity status={status} />
          <AddFriend onSend={run} />
          <Requests incoming={status.incoming} onRespond={run} />
          <Pending outgoing={status.outgoing} />
          <Friends friends={status.friends} />
        </>
      )}

      <button onClick={refresh} className="text-xs font-medium text-accent">
        Refresh
      </button>
    </div>
  );
}

function RegisterForm({
  needsUrl,
  onRegister,
}: {
  needsUrl: boolean;
  onRegister: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-ink">Claim your handle</h3>
      <div>
        <label className="mb-1 block text-xs text-ink-muted">Handle (a–z, 0–9, _, -)</label>
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="arin" className={input} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-muted">Display name (optional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Arin Jaff" className={input} />
      </div>
      {needsUrl && (
        <div>
          <label className="mb-1 block text-xs text-ink-muted">
            This instance&apos;s public URL (how friends reach you)
          </label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://traininggeeks.you.com" className={input} />
        </div>
      )}
      <button
        onClick={() => onRegister(() => registerHandle(handle, name, url))}
        className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Register
      </button>
    </div>
  );
}

function Identity({ status }: { status: FederationStatus }) {
  return (
    <div className="rounded border border-line bg-surface px-3 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink">@{status.handle}</span>
        <span className="text-xs text-ink-muted">on {status.directoryUrl}</span>
      </div>
      <p className="mt-1 break-all text-[11px] text-ink-muted">
        identity {status.publicKey?.slice(0, 16)}… · serving {status.publicUrl}
      </p>
    </div>
  );
}

function AddFriend({
  onSend,
}: {
  onSend: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [handle, setHandle] = useState("");
  const [scope, setScope] = useState<Set<string>>(new Set(["calendar", "pmc"]));
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">Add a friend</h3>
      <div className="flex gap-2">
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="their handle" className={input} />
        <button
          onClick={() => onSend(() => sendFriendRequest(handle, [...scope]))}
          className="shrink-0 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Send request
        </button>
      </div>
      <div>
        <span className="mb-1 block text-xs text-ink-muted">Share with them:</span>
        <ScopePicker value={scope} onChange={setScope} />
      </div>
    </div>
  );
}

function Requests({
  incoming,
  onRespond,
}: {
  incoming: FederationStatus["incoming"];
  onRespond: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  if (incoming.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">Friend requests</h3>
      {incoming.map((r) => (
        <RequestRow key={r.publicKey} handle={r.handle} onRespond={onRespond} />
      ))}
    </div>
  );
}

function RequestRow({
  handle,
  onRespond,
}: {
  handle: string;
  onRespond: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [scope, setScope] = useState<Set<string>>(new Set(["calendar", "pmc"]));
  return (
    <div className="rounded border border-line px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">@{handle}</span>
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(() => respondToFriend(handle, true, [...scope]))}
            className="rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover"
          >
            Accept
          </button>
          <button
            onClick={() => onRespond(() => respondToFriend(handle, false, []))}
            className="rounded border border-line px-3 py-1 text-xs text-ink-muted hover:border-fatigue hover:text-fatigue"
          >
            Decline
          </button>
        </div>
      </div>
      <div className="mt-1.5">
        <span className="mb-1 block text-xs text-ink-muted">Share back with them:</span>
        <ScopePicker value={scope} onChange={setScope} />
      </div>
    </div>
  );
}

function Pending({ outgoing }: { outgoing: FederationStatus["outgoing"] }) {
  if (outgoing.length === 0) return null;
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-ink">Sent requests</h3>
      {outgoing.map((o) => (
        <div key={o.publicKey} className="flex items-center gap-2 text-sm text-ink-muted">
          <span>@{o.handle}</span>
          <span className="text-xs italic">pending</span>
        </div>
      ))}
    </div>
  );
}

function Friends({ friends }: { friends: FederationStatus["friends"] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">Friends</h3>
      {friends.length === 0 ? (
        <p className="text-sm text-ink-muted">No friends yet. Send a request above.</p>
      ) : (
        <ul className="space-y-1.5">
          {friends.map((f) => (
            <li key={f.publicKey} className="flex items-center gap-2 rounded border border-line px-3 py-2 text-sm">
              <PresenceDot online={f.presence.online} />
              <span className="font-medium text-ink">@{f.handle}</span>
              {f.displayName && <span className="text-ink-muted">{f.displayName}</span>}
              <span className="ml-auto flex flex-wrap items-center gap-1">
                {f.sharesWithMe.length > 0 ? (
                  <>
                    <span className="text-[10px] text-ink-muted">shares</span>
                    {f.sharesWithMe.map((s) => (
                      <span key={s} className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-ink-muted">
                        {s}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-[10px] text-ink-muted">shares nothing yet</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
