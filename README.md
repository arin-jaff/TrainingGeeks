# TrainingGeeks

[![CI](https://github.com/arin-jaff/TrainingGeeks/actions/workflows/ci.yml/badge.svg)](https://github.com/arin-jaff/TrainingGeeks/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/db-node%3Asqlite-003B57?logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
![Self-hosted](https://img.shields.io/badge/self--hosted-yes-45ae01)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-1840ec)](LICENSE)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-1840ec)

**The training log you actually own — open-source, self-hosted, and subscription-free.**

Calendar, performance-management charts, dashboards, zones, peak performances,
training plans, strength analytics, wellness metrics, and injury tracking — a
full endurance + strength analytics suite that runs on your machine, stores
data in a single file you control, and never asks for your credit card.

## Live demo

**[demo.traininggeeks.net](https://demo.traininggeeks.net)** — not a
mockup: the founder's actual, live training history, served read-only from a
Raspberry Pi at home and auto-syncing from intervals.icu and Garmin.

## Download (early access)

**[TrainingGeeks for macOS](https://github.com/arin-jaff/TrainingGeeks/releases)**
— the self-hosted app as a double-clickable Mac app (Apple Silicon). Your data
lives in `~/Library/Application Support/TrainingGeeks`; nothing leaves your
machine.

Early-access builds aren't notarized by Apple yet, so the first launch takes
one extra step. Drag the app to Applications, open it once (macOS will block
it), then go to **System Settings → Privacy & Security**, scroll down, and
click **Open Anyway**. Terminal alternative:

```bash
xattr -dr com.apple.quarantine /Applications/TrainingGeeks.app
```

Self-hosting the web app (below) remains the primary path; see
[DESKTOP-ROADMAP.md](docs/DESKTOP-ROADMAP.md) for where this is going.

## Contents

- [Why](#why)
- [Features](#features)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Syncing your data](#syncing-your-data)
- [Federation](#federation)
- [Documentation](#documentation)
- [Tests](#tests)
- [Privacy](#privacy)
- [Contributing](#contributing)
- [License](#license)

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
- **Performance Management Chart** — per-sport CTL / ATL / TSB (Fitness,
  Fatigue, Form) with a 60-day forward projection.
- **Configurable dashboards** — add/remove charts: PMC, fitness summary,
  time-in-zone, weekly distance/duration/elevation/kJ/calories, longest
  workout, fitness history, wellness metrics, lift progression, and
  mean-maximal peak power/HR/pace curves.
- **Activity analysis** — streams (uPlot), route maps (MapLibre + OSM), and the
  full metric set: NP, IF, TSS/rTSS, VI, EF, decoupling, cadence, work. Edit
  the title, description, private notes, and RPE; attach images (shown as a
  gallery, and as a thumbnail on the calendar).
- **Strength suite** — strength load (S3), plus per-set detail parsed from
  Garmin FIT files (exercise, reps, time, rest, weight) in an editable table.
  Estimated 1-rep maxes (Brzycki/Epley), a home Strength Maxes leaderboard, a
  `/strength` records page, lift-progression charts, and tonnage.
- **Zones** — HR / power / pace zones from real published methods, editable
  and persisted.
- **Peak performances** — bests by distance/duration with medals.
- **Training plans** — schedule structured plans (e.g. Hal Higdon) onto the
  calendar.
- **Wellness & injuries** — weight, HRV, resting HR, sleep, mood, plus injury
  logs with calendar indicators.
- **Social / federation** (opt-in) — add friends on other self-hosted
  instances and follow each other in an activity feed with kudos, comments,
  and friends-only leaderboards; your data stays on your box. See
  [Federation](#federation).
- **intervals.icu sync** — import activities and planned workouts
  automatically.
- **Export** — CSV export and a calendar `.ics` feed.

Built with Next.js (App Router, TypeScript), Tailwind CSS, `node:sqlite` with
embedded migrations, `@garmin/fitsdk`, ECharts + uPlot, dnd-kit, and MapLibre.
The `src/lib/{fit,metrics,db,connectors,federation}` layers are pure and
framework-agnostic to ease the planned Tauri macOS build.

## Getting started

Requires **Node.js 22.6+** (24 LTS recommended — uses the built-in
`node:sqlite`) and `git`.

```bash
git clone https://github.com/arin-jaff/TrainingGeeks.git
cd TrainingGeeks
npm install
cp .env.example .env.local   # then edit (see Configuration)
npm run dev                  # http://localhost:3000
```

Production mode:

```bash
npm run build
npm start
```

The SQLite database and migrations are created automatically on first run.
Then add your data from **Settings > Apps & Devices** (intervals.icu sync),
the Import page (FIT files), or by hand from the calendar.

## Configuration

Create a `.env.local` (all variables are optional):

| Variable | Purpose |
| --- | --- |
| `TG_PASSWORD` | Enables single-password auth. If unset, the app is open (good for a trusted LAN / localhost). |
| `TG_SESSION_SECRET` | Secret used to sign the session cookie. Set this whenever `TG_PASSWORD` is set. |
| `TG_INTERVALS_ATHLETE_ID` | Your intervals.icu athlete ID (or set it in Settings > Apps & Devices). |
| `TG_INTERVALS_API_KEY` | Your intervals.icu API key. |
| `TG_SYNC_TOKEN` | Bearer token allowing a background sync daemon to call `/api/sync` and the federation heartbeat. |
| `TG_READONLY` | Set to `1` for a public, view-only demo (blocks writes, hides Settings). |
| `TG_DIRECTORY_URL` | *(federation, optional)* Coordination directory to federate through. Unset = Social is off. |
| `TG_PUBLIC_URL` | *(federation, optional)* This instance's own public HTTPS URL, so friends can reach it. |

> When `TG_PASSWORD` is set the app requires sign-in and the landing page is
> served at `/login`. Run behind HTTPS for any non-local deployment.

## Syncing your data

In **Settings > Apps & Devices**, enter your intervals.icu Athlete ID and API
key (intervals.icu > Settings > Developer), enable sync, and use **Sync now**
or **Sync history** to backfill. Sync is entirely opt-in and runs between your
instance and intervals.icu only.

### Why intervals.icu and not Strava directly?

intervals.icu is the recommended sync path because it already aggregates
Garmin, Wahoo, Strava, and more — and hands TrainingGeeks the original
activity files. A direct Strava integration is intentionally not built in: as
of 2026 Strava requires a paid subscription for API access, its API only
returns processed streams (not the original device file), and its 2024 API
agreement adds terms better handled upstream. Pulling from intervals.icu
sidesteps all of that while giving richer data.
(Strava > intervals.icu > TrainingGeeks works today.)

## Federation

An optional, opt-in module lets independently self-hosted instances add
friends and share training data — coordinated by a lean, pluggable directory
service. Your data stays on your box; only what you choose to share is
exposed. The **Social** tab includes a friend activity feed with kudos and
comments, a friends-only weekly leaderboard, presence, and an offline cache so
friends stay viewable when their instance is down.

To enable it, set `TG_DIRECTORY_URL` (e.g. the reference directory at
`https://directory.traininggeeks.net`) and `TG_PUBLIC_URL`, restart, and claim
a handle in the Social tab. The coordination server lives in its own repo:
**[TrainingGeeks-Directory](https://github.com/arin-jaff/TrainingGeeks-Directory)**
(see its `PLAN.md` for the architecture and `DEPLOYMENT.md` to run your own).

## Documentation

- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** — full setup and deployment, including a
  public read-only demo on a Raspberry Pi and the federation heartbeat.
- **[METHODOLOGY.md](docs/METHODOLOGY.md)** — how every number is calculated: TSS,
  NP, CTL/ATL/TSB, the S3 Strength Score, estimated 1RM, zones, plans.
- **[UX-ROADMAP.md](docs/UX-ROADMAP.md)** — the current audit and prioritized
  improvement roadmap.
- **[SECURITY.md](SECURITY.md)** — reporting vulnerabilities.

## Tests

```bash
npm test          # node:test unit/integration suite
npx tsc --noEmit  # type-check
```

## Privacy

TrainingGeeks collects nothing and phones nowhere. See the in-app
[Privacy Policy](src/app/privacy/page.tsx) (served at `/privacy`).

## Contributing

Issues and pull requests are very welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md) for local setup, the test workflow, and the
commit conventions. Metrics follow standard endurance-training definitions
(documented in [METHODOLOGY.md](docs/METHODOLOGY.md)).

Bring PRs (Pull Requests) so we can keep hitting PRs (Personal Records).

## License

Licensed under the **GNU Affero General Public License v3.0 or later** — see
[LICENSE](LICENSE). In short: you can use, modify, and self-host this freely,
but if you run a modified version as a network service, you must make your
source available to its users under the same license.

## Acknowledgements

- [intervals.icu](https://intervals.icu) for the sync API.
- [Octicons](https://github.com/primer/octicons) (MIT) for UI icons.
- Several features were inspired by the open-source
  [OpenAthlete](https://github.com/openathleteorg/openathlete) project
  (reimplemented here, not copied).
