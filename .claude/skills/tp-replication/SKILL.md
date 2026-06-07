---
name: tp-replication
description: Live 1-to-1 replication of the TrainingPeaks UI using the Playwright MCP. Use when mirroring TrainingPeaks pages/flows into TrainingGeeks against the real app (not static screenshots).
---

# Live TrainingPeaks Replication

Goal: rebuild TrainingGeeks screens to match app.trainingpeaks.com **exactly** —
layout, colors, spacing, typography, component states, and flow — by reading the
**live** TP app via the Playwright MCP, not guessing from stills.

## One-time login

The Playwright MCP runs a **persistent** Chromium profile
(`~/.cache/tg-playwright-profile`), so a TrainingPeaks login persists across
sessions. To (re)establish it:

1. `mcp__playwright__browser_navigate` → `https://app.trainingpeaks.com/`.
2. If not logged in, ask the user to sign in **themselves** in the opened
   window. Never request or type their password — wait for them to finish.
3. Confirm with `browser_snapshot` that an authenticated page loaded.

## Reading the real design

For each TP screen, gather ground truth before editing ours:

- `browser_take_screenshot` — pixel reference (1440×900 viewport).
- `browser_snapshot` — accessibility/DOM tree: labels, order, structure.
- `browser_evaluate` — pull exact tokens, e.g. computed styles:
  `getComputedStyle($0)` for color, background, font-size/weight, padding,
  border, border-radius of headers, cards, nav, summary cells, chart legends.
- Capture **interactive states** static images can't: open the workout detail
  **modal**, hover charts, open dropdowns, switch tabs — screenshot each.

## Route mapping (TP → ours)

| TrainingPeaks | TrainingGeeks |
|---|---|
| Home | `/` |
| Calendar | `/calendar` |
| Workout detail (modal on calendar) | `/activity/[id]` → rebuild as a modal |
| Dashboard (Legacy) | `/dashboard` |
| Account Settings | `/settings` |

## The loop (per screen, one modular commit each)

1. Capture TP (screenshot + snapshot + computed tokens).
2. Capture ours via `scripts/shoot.mjs <url> /tmp/x.png` or the MCP.
3. Diff: nav, header, card, summary, colors, fonts, spacing, labels, states.
4. Edit our components/Tailwind tokens to match the measured TP values.
5. Re-capture both; repeat until only data-dependent gaps remain.
6. Commit (author arin-jaff, no AI attribution).

## Notes

- Local data: the app has real intervals.icu activities (auto-seeded connector),
  so charts/calendar have realistic depth for comparison. Use `TG_TODAY` only
  for deterministic captures.
- TP is a **visual/structural reference** for a personal self-hosted clone — do
  not copy proprietary raster assets; mirror layout and styling.
- Known data-only gaps we can't fake: weather lines, per-set/RPE/comment chips.
