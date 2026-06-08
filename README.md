# TrainingGeeks

[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/db-node%3Asqlite-003B57?logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
![Self-hosted](https://img.shields.io/badge/self--hosted-yes-45ae01)
[![Stars](https://img.shields.io/github/stars/arin-jaff/TrainingGeeks?style=flat&logo=github)](https://github.com/arin-jaff/TrainingGeeks)
[![Issues](https://img.shields.io/github/issues/arin-jaff/TrainingGeeks?logo=github)](https://github.com/arin-jaff/TrainingGeeks/issues)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-1840ec)

**The training log you actually own — open-source, self-hosted, and gloriously subscription-free.** 🏃‍♂️🚴‍♀️🏊

Calendar, performance-management charts, dashboards, zones, peak performances,
training plans, wellness metrics, and injury tracking — a full analytics suite
that runs on *your* machine, stores data in a single file you control, and never
asks for your credit card. All the numbers you love, none of the paywall. 💪

## 🔴 Live demo

**[See it running on real data →](https://YOUR-DEMO-URL)**

Not a mockup — that's the founder's actual, live training history, served
**read-only** from a Raspberry Pi at home and auto-syncing from intervals.icu and
Garmin. (Maintainers: set this URL once your demo box is online.)

---

## Why

- **Your data, your machine.** Everything is stored in a local SQLite database.
  There is no TrainingGeeks cloud, account, or server collecting anything.
- **No subscription, no upsell, no ads, no telemetry.**
- **You're in control.** Don't like a chart? Change it. Missing a feature?
  Build it, or open an issue.

## Features

- **Calendar** — plan and log workouts, drag to reschedule, quick-add any
  workout/metric/injury on any date. Completed days show a green banner,
  past-due planned days go red.
- **Performance Management Chart** — per-sport CTL / ATL / TSB (Fitness, Fatigue,
  Form) with a 60-day forward projection.
- **Configurable dashboards** — add/remove charts: PMC, fitness summary,
  time-in-zone, weekly distance/duration/elevation/kJ/calories, longest workout,
  fitness history, wellness metrics, and mean-maximal peak power/HR/pace curves.
- **Activity analysis** — streams (uPlot), route maps (MapLibre + OSM), and the
  full metric set: NP, IF, TSS/rTSS, VI, EF, decoupling, work.
- **Strength load (S³)** — a duration × perceived-effort model for lifting/core.
- **Zones** — HR / power / pace zones from real published methods, editable and
  persisted.
- **Peak performances** — bests by distance/duration with medals.
- **Training plans** — schedule structured plans (e.g. Hal Higdon) onto the
  calendar.
- **Wellness & injuries** — weight, HRV, resting HR, sleep, mood, plus injury
  logs with calendar indicators.
- **intervals.icu sync** — import activities and planned workouts automatically.
- **Export** — CSV export and a calendar `.ics` feed.

## Tech stack

Next.js (App Router, TypeScript) · Tailwind CSS · `node:sqlite` (built-in) with
embedded SQL migrations · `@garmin/fitsdk` · ECharts + uPlot · dnd-kit ·
MapLibre. The `src/lib/{fit,metrics,db,connectors}` layers are kept pure and
framework-agnostic to ease the planned Tauri macOS build.

## Quick start

Requires **Node.js 22.6+** (24 LTS recommended — uses the built-in
`node:sqlite`) and `git`.

```bash
git clone https://github.com/arin-jaff/TrainingGeeks.git
cd TrainingGeeks
npm install
cp .env.example .env.local   # then edit (see Configuration)
npm run dev                  # http://localhost:3000
```

Build and run in production mode:

```bash
npm run build
npm start
```

The SQLite database and migrations are created automatically on first run.
Then add your data from **Settings → Apps & Devices** (intervals.icu sync), the
Import page (FIT files), or by hand from the calendar.

📘 **Full setup & deployment** — including running a public read-only demo on a
Raspberry Pi — is in **[DEPLOYMENT.md](DEPLOYMENT.md)**.
📐 **How every number is calculated** (TSS, NP, CTL/ATL/TSB, the S³ Strength
Score, zones, plans) is in **[METHODOLOGY.md](METHODOLOGY.md)**.

## Configuration

Create a `.env.local` (all variables are optional):

| Variable | Purpose |
| --- | --- |
| `TG_PASSWORD` | Enables single-password auth. If unset, the app is open (good for a trusted LAN / localhost). |
| `TG_SESSION_SECRET` | Secret used to sign the session cookie. Set this whenever `TG_PASSWORD` is set. |
| `TG_INTERVALS_ATHLETE_ID` | Your intervals.icu athlete ID (or set it in Settings → Apps & Devices). |
| `TG_INTERVALS_API_KEY` | Your intervals.icu API key. |
| `TG_SYNC_TOKEN` | Bearer token allowing a background sync daemon to call `/api/sync`. |

> When `TG_PASSWORD` is set the app requires sign-in and the landing page is
> served at `/login`. Run behind HTTPS for any non-local deployment.

## intervals.icu sync

In **Settings → Apps & Devices**, enter your Athlete ID and API key (found at
intervals.icu → Settings → Developer), enable sync, and use **Sync now** or
**Sync history** to backfill. Sync is entirely opt-in and runs between your
instance and intervals.icu only.

## Tests

```bash
npm test          # node:test unit/integration suite
npx tsc --noEmit  # type-check
```

## Privacy

TrainingGeeks collects nothing and phones nowhere. See the in-app
[Privacy Policy](src/app/privacy/page.tsx) (served at `/privacy`).

## Contributing

Issues and pull requests are very welcome — file one from the Issues tab.
Metrics follow standard endurance-training definitions.

## Acknowledgements

- [intervals.icu](https://intervals.icu) for the sync API.
- Several features were inspired by the open-source
  [OpenAthlete](https://github.com/openathleteorg/openathlete) project
  (reimplemented here, not copied).
