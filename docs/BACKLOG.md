# TrainingGeeks — Feature Backlog

Ideas captured for later. The **active roadmap** (in priority order, currently being built) lives
at the top; the **back-burner** features below are parked until the active set ships. Each entry
keeps its original roadmap sketch and a rough effort estimate (S/M/L).

---

## Shipped

- **Structured workout builder + watch export** — visual interval builder, scheduled to the
  calendar, exported as `.FIT` workout files. Filled the `/workout-library` stub.
- **Training heatmap page** — every GPS track on one dark MapLibre canvas, sport/year filters.
  Replaced the `/routes` stub.
- **Laps & splits table** — device laps from `lapMesgs` plus auto 1 mi/1 km splits from the
  stream, zone-colored on the activity page.
- **Duplicate protection** — activities whose recording windows overlap are flagged at
  `/duplicates` with a Home cue; pick the recording to keep, take individual fields from the
  other, merge and delete. Catches the watch-plus-phone double record that content hashing
  cannot see.
- **Map-first activity page** — the route renders above the tabs, no click-through to Analyze.
- **Public activity share links** — opt-in `/share/<token>` (128 CSPRNG bits), strict allow-list
  of rendered fields, noindex, revoke by row delete. Middleware exempts exactly one segment.
- **One-click backup & restore** — Settings downloads a `.tar.gz` of a `VACUUM INTO` snapshot
  plus uploads and raw FITs; restore validates the listing (paths *and* member types), the
  manifest and `PRAGMA integrity_check` before swapping, and moves the old database aside.

## Active roadmap (in build order)

1. **Readiness briefing on Home** — combine HRV, resting HR, sleep, and TSB into a morning
   verdict dial ("green light for intensity") next to today's planned workout.
2. **Race-day form projector** — reuse the PMC 60-day projection keyed to event dates; each
   event card shows projected Fitness/Form on race day with a sparkline.
3. **Year in Review** — annual wrap (totals, PRs, biggest week, longest streak, hardest day) at
   `/wrapped/[year]` with a canvas → PNG share export.
4. **Apple Developer signing** — App Store Connect access is granted; replace the ad-hoc
   signature with a real Developer ID identity, re-enable the hardened runtime, notarize and
   staple in CI. See `DESKTOP-ROADMAP.md` §M3.

---

## Back-burner

### 7. Dark mode — Effort: M
The brand is already navy; the daylight main surface is the odd one out.
Roadmap: Tailwind class strategy → re-map the token palette (surface/ink/line dark values) →
toggle in Settings + `prefers-color-scheme` default → chart theme swap (ECharts/uPlot).

### 8. Cmd-K command palette — Effort: M
Jump to any activity by name/date, any page, any action ("add workout," "sync now"). SQLite
`LIKE` is plenty.
Roadmap: palette component (existing dropdown patterns) → search endpoint → action registry →
keyboard shortcut.

### 9. Single-scroll activity page — Effort: M
Merge the Summary/Analyze tabs: sticky metrics rail on the left, map → streams → splits →
photos scrolling on the right. One glance, no tab-switching; much better on mobile.
Roadmap: layout restructure of `AnalyzeView` → sticky rail → mobile stack order → ship behind
the existing tabs first, then flip.

### 12. Group challenges — Effort: M–L
Weekly/monthly targets among friends ("most time," "200 km club"), ledger on the directory like
kudos, progress bars on `/social`.
Roadmap: directory challenge tables + endpoints (same signed/authz model) → app join/create UI
→ progress from the existing feed rollups.

### 13. Ghost comparison — Effort: M
Overlay two efforts — this year's race vs last year's, or a friend's shared run on the same
course — on one stream chart + map with a time-delta readout. Fills the `/workout-comparison`
stub.
Roadmap: activity picker → aligned-by-distance overlay in uPlot → delta strip → friend-activity
support via the share scope.

### 14. Menu-bar mini widget — Effort: S–M
Tray icon with today's plan, CTL/TSB, and a sync button — glanceable without opening the window.
Roadmap: Tauri tray API → tiny status endpoint → popover webview.

### 15. Watch auto-import — Effort: M
Garmin mounts as USB storage; the desktop app watches for it and imports new FITs automatically.
"Plug in watch, training appears" — the killer desktop moment.
Roadmap: volume-watch in the shell or Node sidecar → dedupe via existing `fit_hash` →
notification toast.
