# TrainingGeeks — UX Audit & Improvement Roadmap

A structural audit of the app as of June 2026 (post strength suite + social
federation), and a prioritized, implementation-ready roadmap focused on user
experience. Items reference the real modules so any of them can be picked up
cold. Effort: **S** (< half a day), **M** (a day or two), **L** (multi-day).

## Audit summary

**What's strong**

- Core analytics loop is complete and TP-faithful: calendar → activity →
  PMC/dashboards → peaks → zones → plans, with strength (S³, sets, 1RM) and
  wellness as first-class citizens.
- Clean layering: `src/lib/{fit,metrics,db,connectors,federation}` is pure and
  framework-agnostic (23.7k LOC total, well-tested where it counts), which
  keeps the future Tauri port realistic.
- Social federation is genuinely differentiated: P2P reads with a thin
  directory, offline cache fallback, kudos/comments that survive peers being
  down, and it degrades correctly on the read-only demo.

**Where the friction is**

1. **Discoverability.** The top nav shows Home / Calendar / Dashboard / ATP /
   Social, but `/peaks`, `/metrics`, `/progression`, `/strength`, and
   `/import` are only reachable from Home panels or by URL. New users won't
   find half the app.
2. **Three stub pages** (`/routes`, `/workout-comparison`, `/workout-library`)
   render ComingSoon — fine, but they're dead ends if linked anywhere.
3. **Ops drag.** The `readonly-mode` branch diverges from `main` only by
   enforcement code that is already gated behind `TG_READONLY` at runtime;
   every sync merge conflicts in `middleware.ts` / `CalendarGrid.tsx`.
4. **Small data-display inconsistencies.** Rides show pace (min/mi) where
   cyclists expect speed (mph); presence can read "Offline" for a reachable
   friend because only the Friends panel heartbeats.
5. **No onboarding.** A fresh install lands on an empty Home with no pointer
   to "connect intervals.icu / import a FIT / set zones".

---

## Phase A — Quick wins (each S)

| # | Item | Implementation |
| --- | --- | --- |
| A1 | **Speed for rides, pace for foot/water.** | Add `formatSpeed(mps, units)` to `src/lib/util/format.ts`; use it for `bike` in `FeedCard.tsx` stats and `AnalyzeView.tsx` metric rows ("Avg Speed", mph/km/h). |
| A2 | **Nav discoverability.** | Add the missing destinations to `TopNav.tsx` — either as items in the existing responsive dropdown or a "Analyze" group (Peaks, Progression, Strength, Metrics) + "Import". Hide the three stub routes from any links. |
| A3 | **Heartbeat on social view.** | `assembleFeed()` (`src/lib/federation/feedServer.ts`) should fire `dir.heartbeat(...).catch(() => {})` like `getFederationStatus` does, so opening Social keeps presence fresh both ways. |
| A4 | **Owner can moderate comments.** | The directory already allows the activity owner to delete any comment; `FeedCard.tsx` only shows Delete when `c.mine`. Show it when `c.mine \|\| item.person.isSelf`. |
| A5 | **Read-only indicator on main.** | `isReadOnly()` exists on `main` but nothing shows it. Render a small "Read-only" chip in `TopNav` when active — also surfaces the `TG_READONLY=1` `.env.local` footgun instantly (it silently disabled social interactions during testing). |
| A6 | **Leaderboard polish.** | Space in "Name (you)"; tooltip explaining "stress" = TSS + S³; allow rank-by toggle (time / distance / stress) since the pure `leaderboard()` already returns all three. |

## Phase B — Flow improvements (near-term)

| # | Item | Effort | Implementation |
| --- | --- | --- | --- |
| B1 | **Collapse `readonly-mode` into `main`.** | M | Move the readonly middleware block + UI gating onto `main` behind the existing `TG_READONLY` flag; delete the branch; point `sync-readonly.yml` at `main` → build → `readonly-deploy`. Kills the recurring merge conflicts permanently. |
| B2 | **Social "new activity" badge.** | M | Store `social_last_seen` (settings). TopNav fetches a cheap count of feed items newer than it (reuse `assembleFeed` summary or a lighter count query) and shows a dot on Social. Clear on visit. |
| B3 | **Feed pagination.** | S | "Show more" in `SocialHub` revealing past 100 — `buildFeed` already takes `{days, limit}`; add a `?window=60` search param the RSC reads. |
| B4 | **Activity prev/next.** | S | On `/activity/[id]`, arrows to the chronologically adjacent activity (one query in `getActivityDetail`'s file). |
| B5 | **Onboarding empty state.** | M | When the DB has zero activities, Home shows a 3-step checklist: connect intervals.icu (Settings → Apps & Devices), import a FIT (`/import`), set zones. Components: `EmptyState.tsx` already exists. |
| B6 | **Drag-and-drop FIT import.** | M | Accept FIT drops on the calendar (reuses `/import` parsing path); show per-file progress for bulk imports. |
| B7 | **Stub pages: build or bury.** | M–L each | Workout Library = reusable planned-workout templates (schema exists via `planned_workout`); Routes = cluster GPS activities by start+polyline similarity; Comparison = two-activity overlay using existing uPlot streams. Until built, remove inbound links. |

## Phase C — Quality of life (medium-term)

| # | Item | Effort | Notes |
| --- | --- | --- | --- |
| C1 | **Dark mode.** | M | Tailwind `class` strategy; tokens already centralized in `tailwind.config.ts` (`surface`, `ink`, `line`); persist in settings; keep navy/blue identity. |
| C2 | **Command palette / global search.** | M | Cmd-K over activities (name/date/sport), pages, and settings actions. Local SQLite `LIKE` is plenty at this scale. |
| C3 | **Backup & restore.** | M | Settings button to download the SQLite file + uploads dir as a zip; restore via upload. The single-file DB makes this nearly free and it's the #1 self-hosting safety ask. |
| C4 | **Equipment mileage alerts.** | S | Threshold per equipment (e.g. shoes 400 mi); banner on Home when exceeded. Distance accrual already exists. |
| C5 | **Attachment thumbnails.** | M | Resize images server-side on upload (sharp) instead of serving originals into calendar/gallery; keeps the Pi demo snappy. |
| C6 | **PWA + mobile bottom nav.** | M | Manifest + icons; bottom tab bar under `lg:` for Home/Calendar/Dashboard/Social. The layouts already stack well (verified at 390px). |
| C7 | **Accessibility pass.** | M | Focus rings on icon-only buttons (TopNav, kudos), aria-labels audit, contrast check on `ink-muted` over `surface`. |
| C8 | **Performance audit.** | M | Lazy-load ECharts/MapLibre on first use (uPlot already dynamic); confirm route-level splitting; cache `assembleFeed` per request burst. |

## Phase D — Larger bets

| # | Item | Notes |
| --- | --- | --- |
| D1 | **Tauri macOS build** | The stated goal of the pure `src/lib` layering; wrap Next output or extract the lib + a thin native UI. |
| D2 | **Social 3.5: group challenges & shared plans** | Weekly distance/time challenges among friends (directory keeps the ledger, same authz model); share a training-plan template to a friend's library. |
| D3 | **Coach / multi-athlete mode** | A second athlete row + switcher; the schema is single-athlete today, so this is a real migration. |
| D4 | **Notifications** | Directory-side "since" cursor per friendship → app polls on heartbeat → local notification center (and PWA push once C6 lands). |

## Sequencing recommendation

1. **Phase A in one sitting** — all six are S and individually committable.
2. **B1 immediately after** — every future push pays the merge-conflict tax
   until it's done.
3. Then B2–B6 in any order (B5/B6 best for new-user funnel; B2 keeps the
   social loop sticky), with Phase C scheduled around real usage feedback.
4. The pending ops task (directory on the Pi + `TG_DIRECTORY_URL` on the live
   instance) unblocks real-world social use and should ride along with any of
   the above.
