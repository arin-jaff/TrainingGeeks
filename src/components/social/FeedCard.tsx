"use client";

import { useEffect, useState } from "react";
import { giveKudos, postComment, removeComment } from "@/app/actions/social";
import type { SocialFeedItem } from "@/lib/federation/feedServer";
import type { ActivitySocial } from "@/lib/federation/client";
import type { Modality, Units } from "@/lib/db/types";
import { diffDays } from "@/lib/util/dates";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  MODALITY_LABEL,
} from "@/lib/util/format";
import { MODALITY_COLOR } from "@/lib/util/colors";
import SportImage from "@/components/SportImage";
import { CommentIcon, ThumbsUpFillIcon, ThumbsUpIcon } from "@/components/icons";

/** "Today" / "Yesterday" / "Mon, Jun 1" — feed dates read as time, not data. */
export function feedDate(date: string, today: string): string {
  const ago = diffDays(date, today);
  if (ago === 0) return "Today";
  if (ago === 1) return "Yesterday";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function Avatar({
  handle,
  displayName,
  size = 34,
}: {
  handle: string;
  displayName: string | null;
  size?: number;
}) {
  const initials = (displayName || handle)
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[#1a2b49] font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

function ThumbIcon({ filled }: { filled: boolean }) {
  return filled ? <ThumbsUpFillIcon size={14} /> : <ThumbsUpIcon size={14} />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-ink">{value}</div>
    </div>
  );
}

/**
 * Strava-style photo strip: one image runs full width, more become a grid.
 * Own images come straight from this instance (downscaled via ?w=); friends'
 * are proxied through /api/social/image (this server signs the peer fetch).
 * Images that fail (friend offline) hide themselves rather than break a card.
 */
function ImageStrip({ item }: { item: SocialFeedItem }) {
  const ids = (item.imageIds ?? []).slice(0, 3);
  if (ids.length === 0) return null;
  const src = (id: number) =>
    item.person.isSelf
      ? `/api/activity-file/${id}?w=900`
      : `/api/social/image?handle=${encodeURIComponent(item.person.handle)}&id=${id}`;
  return (
    <div
      className={[
        "grid gap-0.5 border-t border-line",
        ids.length === 1 ? "grid-cols-1" : ids.length === 2 ? "grid-cols-2" : "grid-cols-3",
      ].join(" ")}
    >
      {ids.map((id) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={id}
          src={src(id)}
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          className={[
            "w-full object-cover",
            ids.length === 1 ? "max-h-96" : "aspect-square",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export default function FeedCard({
  item,
  today,
  units,
  readOnly,
}: {
  item: SocialFeedItem;
  today: string;
  units: Units;
  readOnly: boolean;
}) {
  const modality = item.modality as Modality;
  const isStrength = modality === "lift" || modality === "core";
  const stress = isStrength ? item.s3 : item.tss;
  const p = item.person;

  const [kudos, setKudos] = useState({
    count: item.counts?.kudos ?? 0,
    mine: item.counts?.mine ?? false,
  });
  const [commentCount, setCommentCount] = useState(item.counts?.comments ?? 0);
  const [open, setOpen] = useState(false);

  const onKudos = async () => {
    // Optimistic flip; reconciled with the directory's answer.
    setKudos((k) => ({ count: k.count + (k.mine ? -1 : 1), mine: !k.mine }));
    const r = await giveKudos(p.handle, item.ref);
    if (r.ok) setKudos({ count: r.count, mine: r.kudosed });
    else setKudos({ count: item.counts?.kudos ?? 0, mine: item.counts?.mine ?? false });
  };

  return (
    <article className="rounded border border-line bg-surface-card">
      <div className="flex items-center gap-2.5 px-3 pt-2.5">
        <Avatar handle={p.handle} displayName={p.displayName} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="truncate font-semibold text-ink">
              {p.displayName || `@${p.handle}`}
            </span>
            {p.displayName && (
              <span className="truncate text-xs text-ink-muted">@{p.handle}</span>
            )}
            {!p.isSelf && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: p.online ? "#45ae01" : "#cbd2dc" }}
                title={p.online ? "Online" : "Offline"}
              />
            )}
          </div>
          <div className="text-xs text-ink-muted">
            {feedDate(item.date, today)}
            {p.staleAsOf && (
              <span title={`Their instance is offline; cached ${p.staleAsOf}`}>
                {" "}
                · cached
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5">
        <SportImage modality={modality} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: MODALITY_COLOR[modality] }}
              aria-hidden
            />
            <span className="truncate text-[15px] font-semibold text-ink">
              {item.name ?? MODALITY_LABEL[modality]}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
            {item.durationS != null && (
              <Stat label="Duration" value={formatDuration(item.durationS)} />
            )}
            {item.distanceM != null && item.distanceM > 0 && (
              <Stat label="Distance" value={formatDistance(item.distanceM, units)} />
            )}
            {!isStrength && item.avgSpeedMps != null && item.avgSpeedMps > 0 && (
              modality === "bike" ? (
                <Stat label="Speed" value={formatSpeed(item.avgSpeedMps, units)} />
              ) : (
                <Stat label="Pace" value={formatPace(item.avgSpeedMps, units, modality)} />
              )
            )}
            {item.avgHr != null && <Stat label="Avg HR" value={String(Math.round(item.avgHr))} />}
            {stress != null && (
              <Stat label={isStrength ? "S³" : "TSS"} value={String(Math.round(stress))} />
            )}
          </div>
        </div>
      </div>

      <ImageStrip item={item} />

      <div className="flex items-center gap-2 border-t border-line px-3 py-1.5">
        {p.isSelf || readOnly ? (
          <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-accent/70">
            <ThumbIcon filled={kudos.count > 0} />
            {kudos.count}
          </span>
        ) : (
          <button
            onClick={onKudos}
            className={[
              "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium",
              kudos.mine ? "text-accent" : "text-accent/70 hover:text-accent",
            ].join(" ")}
            title={kudos.mine ? "Remove kudos" : "Give kudos"}
          >
            <ThumbIcon filled={kudos.mine} />
            {kudos.count}
          </button>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-ink-muted hover:text-accent"
        >
          <CommentIcon size={13} />
          {commentCount === 1 ? "1 comment" : `${commentCount} comments`}
        </button>
      </div>

      {open && (
        <CommentThread
          handle={p.handle}
          activityRef={item.ref}
          readOnly={readOnly}
          isOwner={p.isSelf}
          onCount={setCommentCount}
        />
      )}
    </article>
  );
}

function CommentThread({
  handle,
  activityRef,
  readOnly,
  isOwner,
  onCount,
}: {
  handle: string;
  activityRef: string;
  readOnly: boolean;
  /** Viewing own activity: may moderate (delete) any comment on it. */
  isOwner: boolean;
  onCount: (n: number) => void;
}) {
  const [thread, setThread] = useState<ActivitySocial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetch(`/api/social/thread?handle=${encodeURIComponent(handle)}&ref=${encodeURIComponent(activityRef)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load");
        setThread(json);
        onCount(json.comments.length);
      })
      .catch((e) => setError((e as Error).message));
  };
  // Load once on first expand.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(), []);

  const send = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    const r = await postComment(handle, activityRef, body);
    setBusy(false);
    if (r.ok) {
      setDraft("");
      load();
    } else setError(r.error);
  };

  const del = async (id: number) => {
    const r = await removeComment(id);
    if (r.ok) load();
    else setError(r.error);
  };

  return (
    <div className="space-y-2 border-t border-line bg-surface px-3 py-2.5">
      {thread && thread.kudos.length > 0 && (
        <p className="text-[11px] text-ink-muted">
          Kudos from {thread.kudos.map((k) => k.displayName || `@${k.handle}`).join(", ")}
        </p>
      )}
      {error && <p className="text-xs text-fatigue">{error}</p>}
      {!thread && !error && <p className="text-xs text-ink-muted">Loading…</p>}
      {thread?.comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2">
          <Avatar handle={c.handle} displayName={c.displayName} size={24} />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-ink">
              {c.displayName || `@${c.handle}`}
            </span>
            <span className="ml-2 text-[10px] text-ink-muted">
              {c.createdAt.slice(0, 16)}
            </span>
            <p className="whitespace-pre-line break-words text-sm text-ink">{c.body}</p>
          </div>
          {(c.mine || isOwner) && !readOnly && (
            <button
              onClick={() => del(c.id)}
              className="shrink-0 text-[10px] text-ink-muted hover:text-fatigue"
            >
              Delete
            </button>
          )}
        </div>
      ))}
      {thread && thread.comments.length === 0 && (
        <p className="text-xs text-ink-muted">No comments yet.</p>
      )}
      {!readOnly && (
        <div className="flex gap-2 pt-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Add a comment"
            maxLength={1000}
            className="w-full rounded border border-line bg-surface-card px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={send}
            disabled={busy || !draft.trim()}
            className="shrink-0 rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Post
          </button>
        </div>
      )}
    </div>
  );
}
