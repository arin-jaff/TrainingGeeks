# TrainingGeeks — Project Plan (V1)

A self-hosted, TrainingPeaks-style training analytics app. V1 ships as a **local-first web
app**; the same UI is later wrapped as a **downloadable macOS application**. Lean first,
expand later.

> UI screenshots live in `references/tp-ui/`; real sample FIT files (run/bike/swim, gzipped TP
> exports) live in `references/.fit-files/`. Every UI feature must be checked back against the
> screenshots for visual/behavioral parity. See `.claude/skills/ui-parity/`.

---

## 1. Locked decisions

| Area | Decision |
|---|---|
| Delivery | Web app first → later wrap the same React UI in **Tauri v2** for a macOS `.app`. |
| Runtime | **Local-first**: Next.js (App Router) + local **SQLite** + local FIT file storage. No cloud dependency. Runs via `npm run dev` / Docker on a laptop or data-reserve box. |
| Modalities | **Running, Cycling, Swimming, Lifting, Core.** No rowing. Metrics (pace/power/HR) are general but subdivided per modality. |
| Fitness curves | **4 curves**: Run, Bike, Swim, Strength. **Core folds into Strength.** |
| Cardio load | **TSS** (run/bike/swim) per the standard TrainingPeaks formula. |
| Strength load | **S³ (Strength Stress Score)** — duration-based, completion-driven, no HR. See §6. |
| Fitness display | **Combined Fitness/Fatigue/Form by default + per-modality toggle** (All / Run / Bike / Swim / Strength). |
| Integrations (V1) | **intervals.icu auto-sync** (primary) + **manual FIT/TCX/GPX upload** (same parser path). Garmin/Strava deferred. |
| Users | **Single user + simple password login** (so it can be served on a reachable box). No multi-tenant, no coach view in V1. |
| Units / TZ | **Imperial default** (min/mi) with a metric toggle. **US/Eastern** default day boundary with a timezone toggle. |
| Maps | **MapLibre GL + OpenStreetMap** tiles (no API key). |
| Charts Library | Ship the **core set first** (PMC, Fitness Summary, Time-in-Zones, Distance/Duration by week, Peak curves); add the rest incrementally. |
| Aesthetic | Clean, sharp, data-dense. **No emojis.** Plain text, simple layout. Match TrainingPeaks. |

---

## 2. Tech stack

- **Framework:** Next.js (App Router, TypeScript). Single app, not a monorepo (lean).
- **Styling:** Tailwind CSS. Light theme main surface + dark navy top nav, blue (`#2563EB`-family) accents — matches references.
- **DB:** SQLite via Node's built-in **`node:sqlite`** (zero native build on Node 25), with
  plain SQL migration files + a thin typed repository layer in `src/lib/db`. (Chosen over
  better-sqlite3/Drizzle to avoid native-binding compilation on Node 25. DuckDB optional later.)
- **FIT parsing:** **`@garmin/fitsdk`** (official, decodes records/laps/sessions/developer fields, ships types). Pure TS — no Python sidecar.
- **Charts:**
  - **uPlot** — high-resolution activity streams (HR/power/pace/elevation, synced crosshair/scrubber). Handles 10k+ points.
  - **ECharts** — Performance Management Chart (CTL/ATL/TSB + TSS bars), Fitness Summary pie, dashboard summary charts.
- **Drag & drop:**
  - **react-grid-layout** — resizable dashboard widget grid (Charts Library → drag to dashboard).
  - **dnd-kit** — calendar workout drag/reorder and any free-form card DnD.
- **Maps:** MapLibre GL + OpenStreetMap tiles (no paid Mapbox key required) for the route view.
- **Auth:** single hashed password (env-configured) + signed session cookie. Deliberately minimal.

### Keep logic framework-agnostic (so the Mac wrap is cheap)
Pure, dependency-light modules under `src/lib/` so they port directly into a Tauri build:
`src/lib/fit` (parser), `src/lib/metrics` (TSS/NP/IF/S³/peaks/CTL-ATL-TSB),
`src/lib/db` (schema + queries), `src/lib/connectors` (intervals.icu). UI imports these; they
import nothing UI- or Next-specific.

---

## 3. Architecture & data flow

```
                 ┌─────────────────────────┐
 intervals.icu ──┤  Connectors / Sync       │
 manual upload ──┤  (download original FIT) │
                 └───────────┬─────────────┘
                             ▼
                    Raw FIT storage  (data/fit/raw/, content-hashed)
                             ▼
                       Import queue   (idempotent, dedupe by file hash)
                             ▼
                      FIT parser  (@garmin/fitsdk → normalized records)
                             ▼
                  SQLite  (activities, records, laps, sessions)
                             ▼
                    Metrics engine  (parse-once → compute → cache)
                             ▼
              Daily stress rollup → per-modality CTL/ATL/TSB
                             ▼
            UI  (Home · Calendar · Dashboard · Analyze)
```

Principle from the spec: **FIT → parse once → store normalized records → generate metrics →
cache results.** Re-parsing only happens if the parser version or thresholds change.

---

## 4. Data model (SQLite, Drizzle)

Core tables (V1):

- **athlete** — single row: name, profile, units, timezone, DOB, avatar path.
- **threshold** — versioned thresholds per modality+metric (FTP/power, threshold pace, threshold HR, max/resting HR), with `valid_from` so historical TSS uses the threshold that applied then ("View History" in references).
- **zone** — HR/power/pace zone bands per modality (auto-calc supported).
- **activity** — one per workout: `modality` (run/bike/swim/lift/core), `sport_detail`, start time, source (manual/intervals), `fit_hash`, duration, distance, elevation, avg/max HR/power/pace/cadence, calories, kJ, and computed metrics: `tss`, `s3`, `np`, `if`, `vi`, `ef`, `decoupling`, route polyline, raw FIT path.
- **record** — time-series samples (timestamp, lat/lng, alt, hr, power, cadence, speed/pace, temp). Stored compactly (per-activity blob/columnar) to keep the row count sane.
- **lap** / **session** — interval + summary rows from the FIT.
- **planned_workout** — calendar-planned (vs completed) workouts: modality, planned duration/distance/TSS, description, date. Drives planned-vs-actual on the calendar.
- **daily_load** — per day per modality: summed TSS/S³ → CTL, ATL, TSB (cached, recomputed on change).
- **peak** — peak power/pace/HR by duration & distance per activity (and rolling best for Peak Performances).
- **dashboard_layout** — saved react-grid-layout config (which charts, positions, sizes).
- **connector_account** — intervals.icu API key, athlete id, last-sync cursor.
- **event** / **goal** — Home screen events countdown + goals.

`data/` (db file, `fit/raw/`) is **git-ignored**.

---

## 5. Cardio metrics (run / bike / swim)

Implemented exactly per the spec formulas, computed in `src/lib/metrics`:

- **Normalized Power (NP)** — 30s rolling average of power → 4th power → mean → 4th root.
  For run/swim use **Normalized Graded Pace (NGP)** (grade-adjusted pace) as the analog.
- **Intensity Factor (IF)** = NP / FTP  (or NGP / threshold pace).
- **TSS** = `(duration_s × NP × IF) / (FTP × 3600) × 100`. Pace-based equivalent for run/swim
  via NGP and threshold pace. hrTSS fallback when no power/pace.
- **Variability Index (VI)** = NP / avg power (target ≤ 1.05).
- **Efficiency Factor (EF)** = NP (or NGP) / avg HR.
- **Aerobic Decoupling (Pw:Hr / Pa:Hr)** — first-half vs second-half output:HR ratio drift %.
- **Peak curves** — best rolling power/pace/HR for standard durations & distances
  (400m, 800m, 1km, 1mi, 5km, … and 5s/1min/5min/20min/…), feeding the Analyze panel and the
  Peak Performances modal.

All TSS uses the threshold value **valid at the activity date** (versioned `threshold` table).

---

## 6. S³ — Strength Stress Score (new metric)

For **Lifting and Core** (Core folds into the Strength curve). No HR. Driven by **time ×
perceived effort** — a short hard session should still score well.

**V1 formula:**

```
S³ = duration_minutes × (M / 1.5)
M  = 1.0 + (RPE / 10)        # perceived-effort multiplier, clamped to [1.0, 2.0]
RPE ∈ [1..10]                # athlete-entered per workout; default 5
```

- **RPE** (rate of perceived exertion, 1–10) is entered per strength/core workout; **default 5**.
- The multiplier `M` ranges **1.0–2.0** (RPE 5 → **1.5**, the default; RPE 10 → 2.0; low RPE → ~1.1).
- **Calibration:** dividing by 1.5 normalizes the default so a default-effort hour matches a
  moderate cardio hour — at **RPE 5, 60 min → 60 S³** (the "60 TSS = 1 hour, effort 5" anchor).

**Worked examples:**

| Duration | RPE | M | S³ |
|---|---|---|---|
| 60 min | 5 (default) | 1.5 | **60** |
| 30 min | 8 | 1.8 | 36 |
| 20 min | 9 (short/intense) | 1.9 | ~25 |
| 90 min | 3 (easy) | 1.3 | 78 |
| 60 min | 10 (max) | 2.0 | 80 |

S³ feeds the **Strength** daily load exactly like TSS feeds cardio → same CTL/ATL/TSB engine.

**Forward-compatible (V2+, not built yet):** the multiplier can later incorporate volume load
(sets × reps × weight) or zone time instead of, or alongside, manual RPE. The schema reserves
the multiplier slot so this is additive, not a rewrite.

---

## 7. Fitness model (CTL / ATL / TSB)

Standard exponentially-weighted moving averages, computed **per modality** and **combined**:

```
daily_stress(modality, day) = Σ TSS (run/bike/swim)  or  Σ S³ (strength incl. core)
CTL_t = CTL_{t-1} + (stress_t − CTL_{t-1}) × (1 − e^(−1/42))     # Fitness, 42-day
ATL_t = ATL_{t-1} + (stress_t − ATL_{t-1}) × (1 − e^(−1/7))      # Fatigue, 7-day
TSB_t = CTL_{t-1} − ATL_{t-1}                                     # Form (yesterday's)
```

- **Combined** curve = EWMA over summed daily stress across all modalities.
- **Per-modality** curves = EWMA over that modality's daily stress.
- Recomputed incrementally when an activity is added/edited; `daily_load` caches results.
- Home shows the combined Fatigue / Fitness / Form boxes (red / dark / orange per references)
  plus Fitness Ramp Rates (7 / 90 / 365-day deltas). Toggle switches the active modality.

---

## 8. Screens (mapped to `references/`)

1. **Home** (`BAFFAF1E…png`) — profile header; Events + Goals (left); Today/Tomorrow workouts
   (center) with "Add a Workout"; Performance Metrics (right): Fatigue/Fitness/Form boxes,
   Fitness Ramp Rate sparklines, Peak Performances list. Modality toggle on the metrics panel.
2. **Calendar** (`5F550EB3…png`) — weekly grid Mon–Sun + a **weekly Summary** column
   (Fitness/Fatigue/Form, durations, distance, TSS). Sport-color-coded workout cards showing
   planned vs completed + TSS. Left rail: Workout Library, Training Plans. Drag-and-drop to
   move/reschedule workouts (dnd-kit). Month/year nav.
3. **Dashboard** (`D230C5B7…png`, `133F68FB…png`) — Legacy Dashboard / Workout Comparison
   tabs; **Charts Library** flyout (searchable, "drag charts to dashboard"); date-range
   selector; **Performance Management Chart** (TSS bars + CTL/ATL/TSB lines), Fitness Summary
   pie, Time-in-Zones bars. Layout persists (`dashboard_layout`).
4. **Workout / Analyze** (`image copy 2.png`) — header with date, Fitness/Fatigue/Form pills,
   duration/distance/TSS; Files / Summary / Analyze tabs; route map; synced time-series graph
   (elevation/power/HR) with scrubbing; **Peak Pace/Power by Distance** panel.
5. **Peak Performances modal** (`image.png`, `image copy.png`) — Sport / Time / Distance / Year
   dropdowns; pace-over-time line chart; ranked 1–N table with View links.
6. **Account Settings** (`78ACC3F9`, `AB86A637`, `1A5FFA9D`, `1234…png`) — Profile; Zones;
   per-modality thresholds (Power, HR, Pace) with auto-calculation, multiple zones, Add/Remove,
   "View History". Save / Save & Close footer.

ATP (Annual Training Plan) tab exists in the nav but is **deferred** past V1.

---

## 9. Connectors / sync

- **intervals.icu** (`src/lib/connectors/intervals`): API-key (HTTP Basic) auth stored in
  `connector_account`. Poll for new activities since last cursor → download original FIT →
  drop into raw storage → enqueue import. Also pull planned workouts to the calendar.
- **Manual upload**: drag-drop `.fit/.tcx/.gpx` (and gzipped `.fit.gz`) → same raw-storage +
  import path. The parser transparently decompresses gzip.
- **Sync daemon**: a scheduled job (Next.js route hit by a cron / `node-cron` in dev, launchd
  when packaged) running the intervals poll on an interval. Idempotent — dedupe by FIT content
  hash so re-syncs never double-count.
- Deferred: **python-garminconnect** (needs a Python sidecar; pristine FIT + wellness/HRV),
  **Strava** (streams-only, ToS limits coach/AI use).

---

## 10. Asset pipeline (per spec)

- Search **approved/licensed** sources only; never copyrighted assets from random sites.
- Download into `assets/raw/`. Record source URL + license for each.
- Generate logo/textures with AI tools when no suitable licensed asset exists; **save the
  prompt, the generated image, and metadata**.
- Maintain **`assets/asset_manifest.json`** for everything imported/generated (filename,
  source, license, prompt if generated, date).
- See `.claude/skills/asset-sourcing/`.

---

## 11. Repository structure

```
traininggeeks/
├── PLAN.md                      (this file)
├── README.md
├── CLAUDE.md                    (always-on conventions for any agent)
├── .claude/skills/
│   ├── contributing/            (commit/PR workflow, modular commits, no-Claude credit)
│   ├── ui-parity/               (always check references/ for parity)
│   └── asset-sourcing/          (licensed assets + manifest rules)
├── references/                  (TrainingPeaks screenshots — source of truth for UI)
├── assets/
│   ├── raw/
│   └── asset_manifest.json
├── src/
│   ├── app/                     (Next.js routes: home, calendar, dashboard, workout, settings)
│   ├── components/              (UI; mirror reference layouts)
│   ├── lib/
│   │   ├── fit/                 (@garmin/fitsdk wrapper → normalized records)
│   │   ├── metrics/             (TSS, NP, IF, VI, EF, decoupling, S³, peaks, CTL/ATL/TSB)
│   │   ├── db/                  (Drizzle schema, migrations, queries)
│   │   └── connectors/          (intervals.icu, sync queue)
│   └── styles/
└── data/                        (git-ignored: sqlite db, fit/raw/)
```

---

## 12. Milestones (modular — one focused commit set per step)

Each step is independently committable and, where it makes sense, demoable. Commits credit
**arin-jaff only** (never Claude) and are modular per step (see `.claude/skills/contributing/`).

- **M0 — Scaffold.** Next.js + TS + Tailwind + Drizzle/SQLite; lint/format; nav shell
  (top nav: Home/Calendar/Dashboard/ATP) matching reference chrome; `data/` ignored.
- **M1 — Data model.** Drizzle schema + migrations for all §4 tables; seed a single athlete.
- **M2 — FIT parser.** `@garmin/fitsdk` → normalized records/laps/sessions; **transparent
  gunzip for `.FIT.gz`**; unit tests against the real run/bike/swim samples in
  `references/.fit-files/`; content-hash dedupe.
- **M3 — Cardio metrics.** NP/NGP, IF, TSS, VI, EF, decoupling, peak curves; unit-tested
  against known values.
- **M4 — S³ + fitness engine.** S³ formula; per-modality + combined CTL/ATL/TSB; `daily_load`
  cache; incremental recompute.
- **M5 — Auth + app shell.** Single-password login + session; route protection.
- **M6 — Import pipeline.** Manual FIT/TCX/GPX upload → raw store → queue → parse → metrics →
  DB; idempotent.
- **M7 — Calendar.** Weekly grid + Summary column; sport-colored planned-vs-actual cards;
  dnd-kit drag/reschedule; add/edit workout.
- **M8 — Home.** Fatigue/Fitness/Form boxes + ramp rates + modality toggle; Today/Tomorrow;
  Events/Goals; Peak Performances list.
- **M9 — Dashboard.** PMC (ECharts), Fitness Summary pie, Time-in-Zones; Charts Library flyout;
  react-grid-layout persistence.
- **M10 — Analyze view.** Map (MapLibre) + synced uPlot streams + scrubbing; Peak Pace/Power by
  Distance; Files/Summary/Analyze tabs.
- **M11 — intervals.icu sync.** Connector + poll daemon + planned-workout pull; settings to add
  API key.
- **M12 — Settings & zones.** Profile; per-modality thresholds + zones with auto-calc + history.
- **M13 — Peak Performances modal.** Sport/Time/Distance/Year filters + chart + ranked table.
- **M14 — Branding & assets.** Logo/favicon via asset pipeline + `asset_manifest.json`.
- **Later — macOS app.** Wrap UI in Tauri v2; launchd-scheduled sync; signed `.app`.
- **Later — ATP, Garmin/Strava connectors, coach/multi-user, nutrition/equipment.**

---

## 13. Resolved decisions & remaining suggestions

**Resolved (locked):**
- **S³** = `duration_min × (M/1.5)`, `M = 1.0 + RPE/10`, default RPE 5 → 60min = 60 S³. (§6)
- **Strictly time × effort** — no completion floor.
- **Units:** imperial default + metric toggle. **TZ:** US/Eastern default + toggle.
- **Maps:** MapLibre + OSM (no key). **Charts:** core set first.
- **Connectors:** manual FIT upload **and** intervals.icu auto-sync both in V1.

**Remaining (non-blocking — sensible defaults chosen, easy to revisit):**
1. **NGP / grade adjustment for runs.** Full grade-adjusted pace needs an elevation model; V1
   ships a simpler grade adjustment and refines later.
2. **DuckDB.** Stay on SQLite for V1; revisit only if dashboard queries get heavy.

Additional suggestions:
- **Threshold history is load-bearing**, not cosmetic — building it in M1/M12 means historical
  TSS stays correct when you change FTP. Worth doing right early.
- **Keep `src/lib` pure** so the Tauri Mac app is a thin wrapper, not a rewrite.
- A small **sample-FIT fixture set** committed under `src/lib/fit/__fixtures__/` makes the
  parser + metrics independently testable without any live connector.
