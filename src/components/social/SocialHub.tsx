"use client";

import { useState } from "react";
import type { SocialFeed } from "@/lib/federation/feedServer";
import type { Modality, Units } from "@/lib/db/types";
import { MODALITY_LABEL } from "@/lib/util/format";
import FederationPanel from "@/components/settings/FederationPanel";
import FeedCard from "./FeedCard";
import Leaderboard from "./Leaderboard";

/**
 * The Social hub: an activity feed of you + your friends on the left, a
 * friends-only leaderboard and who's-online on the right, and the friends /
 * sharing management on its own tab. Stacks to one column on small screens.
 */
export default function SocialHub({
  feed,
  units,
  readOnly,
}: {
  feed: SocialFeed;
  units: Units;
  readOnly: boolean;
}) {
  // Without a directory or a handle there is nothing to feed — go to setup.
  const setupOnly = !feed.enabled || !feed.handle;
  const [tab, setTab] = useState<"feed" | "friends">(setupOnly ? "friends" : "feed");
  const [sport, setSport] = useState<string>("all");

  const sports = [...new Set(feed.items.map((i) => i.modality))];
  const items = sport === "all" ? feed.items : feed.items.filter((i) => i.modality === sport);
  const friendsOnline = feed.people.filter((p) => !p.isSelf && p.online);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["feed", "friends"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            disabled={t === "feed" && setupOnly}
            className={[
              "rounded px-3 py-1 text-sm font-medium capitalize",
              tab === t
                ? "bg-accent text-white"
                : "border border-accent/50 text-accent hover:bg-accent/5 disabled:border-line disabled:text-ink-muted",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "friends" || setupOnly ? (
        <div className="max-w-3xl">
          <FederationPanel units={units} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            {feed.error && (
              <p className="mb-3 rounded border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
                Directory: {feed.error}
              </p>
            )}
            {sports.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {["all", ...sports].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSport(s)}
                    className={[
                      "rounded px-2.5 py-1 text-xs font-medium capitalize",
                      sport === s
                        ? "bg-accent text-white"
                        : "border border-line text-ink-muted hover:text-ink",
                    ].join(" ")}
                  >
                    {s === "all" ? "All" : MODALITY_LABEL[s as Modality] ?? s}
                  </button>
                ))}
              </div>
            )}
            {items.length === 0 ? (
              <div className="rounded border border-line bg-surface-card p-8 text-center text-sm text-ink-muted">
                {feed.people.length <= 1 ? (
                  <>
                    No friends yet — head to the{" "}
                    <button
                      onClick={() => setTab("friends")}
                      className="font-medium text-accent hover:underline"
                    >
                      Friends
                    </button>{" "}
                    tab to add some.
                  </>
                ) : (
                  "No activities in the last 30 days."
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it) => (
                  <FeedCard
                    key={`${it.person.handle}-${it.ref}`}
                    item={it}
                    today={feed.today}
                    units={units}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Leaderboard
              items={feed.items}
              people={feed.people}
              today={feed.today}
              units={units}
            />
            {friendsOnline.length > 0 && (
              <section className="rounded border border-line bg-surface-card px-3 py-2">
                <h3 className="mb-1.5 text-sm font-semibold text-ink">Online now</h3>
                <ul className="space-y-1">
                  {friendsOnline.map((p) => (
                    <li key={p.handle} className="flex items-center gap-2 text-sm text-ink">
                      <span className="h-2 w-2 rounded-full bg-[#45ae01]" aria-hidden />
                      {p.displayName || `@${p.handle}`}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <button
              onClick={() => setTab("friends")}
              className="text-xs font-medium text-accent hover:underline"
            >
              Manage friends & sharing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
