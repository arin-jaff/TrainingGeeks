"use client";

import { useState } from "react";
import { leaderboard, weekStart } from "@/lib/federation/feed";
import type { SocialFeedItem } from "@/lib/federation/feedServer";
import type { FeedPerson } from "@/lib/federation/feed";
import type { Units } from "@/lib/db/types";
import { addDays } from "@/lib/util/dates";
import { formatDistance, formatDuration } from "@/lib/util/format";
import { Avatar } from "./FeedCard";

const MEDAL_SRC = ["/medal-gold.png", "/medal-silver.png", "/medal-bronze.png"];

/**
 * Friends-only training leaderboard, totalled from the same shared activities
 * the feed shows. Ranked by training time — the fairest cross-sport yardstick.
 */
export default function Leaderboard({
  items,
  people,
  today,
  units,
}: {
  items: SocialFeedItem[];
  people: FeedPerson[];
  today: string;
  units: Units;
}) {
  const [period, setPeriod] = useState<"week" | "4wk">("week");
  const start = period === "week" ? weekStart(today) : addDays(today, -27);
  const rows = leaderboard(items, people, start, today);

  return (
    <section className="rounded border border-line bg-surface-card">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <h3 className="text-sm font-semibold text-ink">
          {period === "week" ? "This Week" : "Last 4 Weeks"}
        </h3>
        <div className="flex gap-1">
          {(["week", "4wk"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={[
                "rounded px-2 py-0.5 text-[11px] font-medium",
                period === p
                  ? "bg-accent text-white"
                  : "text-ink-muted hover:text-accent",
              ].join(" ")}
            >
              {p === "week" ? "Week" : "4 wk"}
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r, i) => (
          <li key={r.person.handle} className="flex items-center gap-2.5 px-3 py-2">
            {i < 3 && r.activities > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={MEDAL_SRC[i]} alt={`#${i + 1}`} className="h-4 w-4 shrink-0 object-contain" />
            ) : (
              <span className="w-4 shrink-0 text-center text-xs text-ink-muted">{i + 1}</span>
            )}
            <Avatar handle={r.person.handle} displayName={r.person.displayName} size={24} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-ink">
                {r.person.displayName || `@${r.person.handle}`}
                {r.person.isSelf && <span className="ml-1 font-normal text-ink-muted">(you)</span>}
              </div>
              <div className="text-[11px] text-ink-muted">
                {r.activities === 1 ? "1 activity" : `${r.activities} activities`}
                {r.distanceM > 0 && <> · {formatDistance(r.distanceM, units)}</>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums text-ink">
                {r.durationS > 0 ? formatDuration(r.durationS) : "—"}
              </div>
              {r.stress > 0 && (
                <div className="text-[10px] tabular-nums text-ink-muted">
                  {Math.round(r.stress)} stress
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
