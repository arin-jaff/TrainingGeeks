# TrainingGeeks — Feature Backlog

Ideas captured for later. The **active roadmap** (in priority order, currently being built) lives
at the top; the **back-burner** features below are parked until the active set ships. Each entry
keeps its original roadmap sketch and a rough effort estimate (S/M/L).

---

## Active roadmap (in build order)

1. **Structured workout builder + watch export** — _in progress_. Visual interval builder
   (warmup, 4×800 @ 5K pace, cooldown), schedule to the calendar, and export as `.FIT` workout
   files that load onto a Garmin. Fills the `/workout-library` stub.
2. **Training heatmap page** — every GPS track on one dark MapLibre canvas with additive
   blending; sport/year filters. Replaces the `/routes` stub.
3. **Laps & splits table** — parse `lapMesgs` in `normalize.ts`; auto 1 mi/1 km splits from
   streams for lapless activities; zone-colored pace/HR bars per lap on the activity page.
4. **Readiness briefing on Home** — combine HRV, resting HR, sleep, and TSB into a morning
   verdict dial ("green light for intensity") next to today's planned workout.
5. **Race-day form projector** — reuse the PMC 60-day projection keyed to event dates; each
   event card shows projected Fitness/Form on race day with a sparkline.
6. **Year in Review** — annual wrap (totals, PRs, biggest week, longest streak, hardest day) at
   `/wrapped/[year]` with a canvas → PNG share export.
7. **Public activity share links** — per-activity opt-in tokenized read-only page
   `/share/<token>` with an OG card; revoke UI.
8. **One-click backup & restore** — Settings button to download a zip of the SQLite file +
   uploads; restore by upload with an integrity check; "reveal data folder" on desktop.

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
