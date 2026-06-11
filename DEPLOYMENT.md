# Deploying TrainingGeeks

Two parts:

- **[A. Self-host your own instance](#a-self-host-your-own-instance)** — for
  anyone who downloads the project and wants their own private training log.
- **[B. A public read-only demo on a Raspberry Pi](#b-public-read-only-demo-on-a-raspberry-pi)**
  — an always-on server that shows *your* live data, read-only, to the world.

> **Requirements (both):** Node.js **22.6+** (24 LTS recommended — the app uses
> the built-in `node:sqlite`) and `git`. No external database, no Docker
> required.

---

## A. Self-host your own instance

### 1. Get the code

```bash
git clone https://github.com/arin-jaff/TrainingGeeks.git
cd TrainingGeeks
npm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | What it does |
| --- | --- |
| `TG_PASSWORD` | Set this to require a sign-in password. **Leave blank only on a trusted localhost.** |
| `TG_SESSION_SECRET` | **Required when `TG_PASSWORD` is set.** A long random string: `openssl rand -hex 32`. |
| `TG_INTERVALS_ATHLETE_ID` | Your intervals.icu athlete id (also settable later in Settings → Apps & Devices). |
| `TG_INTERVALS_API_KEY` | Your intervals.icu API key (intervals.icu → Settings → Developer). |
| `TG_SYNC_TOKEN` | Random token used by the background sync daemon / `.ics` feed. `openssl rand -hex 16`. |
| `TG_DIRECTORY_URL` | *(optional, federation)* Coordination directory to federate through. Unset = Social/federation is off. |
| `TG_PUBLIC_URL` | *(optional, federation)* This instance's own public HTTPS URL, so friends can reach it. |

### 3. Build & run

```bash
npm run build
npm start            # http://localhost:3000  (set PORT=4000 to change)
```

On first launch the app creates its SQLite database and runs migrations
automatically. Open the URL, and if you set a password, sign in.

### 4. Get your data in

- **intervals.icu (recommended):** Settings → Apps & Devices → enter Athlete ID
  + API key → **Sync now** (or **Sync history** to backfill). intervals.icu
  itself can auto-import from Garmin, Strava, etc., so this is the one hop you
  need.
- **Manual FIT upload:** the Import page accepts `.fit` files.
- **Manual entry:** hover any calendar day → **+** → log a workout, metric, or
  injury by hand.

### 5. Keep it running (optional)

Use `pm2`, a systemd service (see Part B), or just `npm start` in a terminal
multiplexer. Back up the gitignored **`data/`** directory — that's your whole
training history.

### Updating

```bash
git pull
npm install
npm run build
# restart the server
```

---

## B. Public read-only demo on a Raspberry Pi

Goal: a Pi at home runs the **`readonly-mode`** branch 24/7, auto-syncs your
real data from intervals.icu, and is reachable on the internet as a **read-only
"View Live!"** site. Visitors can explore everything; nobody can edit your data
or open Settings.

**Data flow:** `Garmin → intervals.icu → (sync daemon) → Pi's SQLite → public
read-only site`. You train and edit on your own devices; the Pi mirrors it.

### 1. Prepare the Pi

- Raspberry Pi 4 or 5 (64-bit), Raspberry Pi OS (64-bit) or Ubuntu Server.
- Flash, enable SSH, connect to your network, then `ssh pi@raspberrypi.local`.

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install git
# Node 24 LTS via NodeSource:
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt -y install nodejs
node -v   # expect v24.x
```

### 2. Clone the read-only branch & build

Two branches serve this purpose:

- **`readonly-mode`** — source: `main` + read-only enforcement. Build it
  yourself (needs ~2 GB RAM or swap).
- **`readonly-deploy`** — the same source **with a prebuilt `.next`** published
  by CI on every push to `main`. Use this on low-memory Pis (a 1 GB Pi cannot
  run `next build`).

```bash
cd ~
# Build-capable box:
git clone --branch readonly-mode https://github.com/arin-jaff/TrainingGeeks.git
cd TrainingGeeks && npm install && npm run build

# Or, low-memory Pi (no build step):
git clone --branch readonly-deploy https://github.com/arin-jaff/TrainingGeeks.git
cd TrainingGeeks && npm install
```

### 3. Configure for a read-only public demo

```bash
cp .env.example .env.local
nano .env.local
```

```ini
# Public, view-only: blocks every write and hides Settings.
TG_READONLY=1

# Recommended even for the demo (signs the session machinery).
TG_SESSION_SECRET=<openssl rand -hex 32>

# Your real data source.
TG_INTERVALS_ATHLETE_ID=iXXXXXX
TG_INTERVALS_API_KEY=<your intervals.icu key>

# Lets the local sync daemon refresh data (allowed even in read-only mode).
TG_SYNC_TOKEN=<openssl rand -hex 16>

# Optional hostname split: serve the marketing landing page at one domain
# (its root rewrites to the landing) while the demo domain goes straight to
# the data. Unset = the demo root is the athlete home and the landing is
# reachable at /login.
TG_LANDING_HOST=traininggeeks.net
TG_DEMO_URL=https://demo.traininggeeks.net

# Do NOT set TG_PASSWORD — read-only mode serves reads publicly.
```

Do an initial backfill once built (the server must be running; see next step,
then run): `TG_SYNC_TOKEN=<token> node scripts/sync-daemon.mjs` once, or trigger
**Sync history** from a temporary non-read-only run.

### 4. Run the app as a service (systemd)

```bash
sudo nano /etc/systemd/system/traininggeeks.service
```

```ini
[Unit]
Description=TrainingGeeks (read-only demo)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/TrainingGeeks
EnvironmentFile=/home/pi/TrainingGeeks/.env.local
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now traininggeeks
sudo systemctl status traininggeeks      # should be active (running)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # 200
```

### 5. Keep data live (sync daemon as a service)

The daemon periodically calls the app's `/api/sync` (allowed in read-only mode
via the token), pulling new activities from intervals.icu.

```bash
sudo nano /etc/systemd/system/traininggeeks-sync.service
```

```ini
[Unit]
Description=TrainingGeeks intervals.icu sync
After=traininggeeks.service
Requires=traininggeeks.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/TrainingGeeks
EnvironmentFile=/home/pi/TrainingGeeks/.env.local
Environment=TG_URL=http://localhost:3000
Environment=TG_SYNC_INTERVAL_MIN=30
ExecStart=/usr/bin/node scripts/sync-daemon.mjs
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now traininggeeks-sync
journalctl -u traininggeeks-sync -f       # watch it sync every 30 min
```

### 6. Stay up to date with `main` (auto)

`main` auto-merges into `readonly-mode` on GitHub (the `sync-readonly` Action),
which also builds and publishes `readonly-deploy`. So both branches always
carry the latest features **with** the read-only enforcement. To pull those
onto the Pi, add a small updater + timer (on `readonly-deploy`, skip the
`npm run build` line — the pulled `.next` is already built):

```bash
cat > ~/TrainingGeeks/scripts/pi-update.sh <<'SH'
#!/usr/bin/env bash
set -e
cd /home/pi/TrainingGeeks
git fetch origin
git reset --hard origin/readonly-deploy   # or: git pull --ff-only origin readonly-mode
npm install
# npm run build                           # readonly-mode only
sudo systemctl restart traininggeeks
SH
chmod +x ~/TrainingGeeks/scripts/pi-update.sh
```

```bash
sudo nano /etc/systemd/system/traininggeeks-update.service
# [Service]
# Type=oneshot
# ExecStart=/home/pi/TrainingGeeks/scripts/pi-update.sh

sudo nano /etc/systemd/system/traininggeeks-update.timer
# [Timer]
# OnCalendar=*-*-* 04:00:00
# Persistent=true
# [Install]
# WantedBy=timers.target

sudo systemctl daemon-reload
sudo systemctl enable --now traininggeeks-update.timer
```

### 7. Put it on the internet (HTTPS, no port-forwarding)

**Cloudflare Tunnel (recommended)** — no open ports, free TLS, works behind CGNAT:

```bash
# install cloudflared (arm64)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
sudo install cloudflared /usr/local/bin/
cloudflared tunnel login                      # opens a browser to authorize
cloudflared tunnel create traininggeeks
# Map a hostname to the local app:
cloudflared tunnel route dns traininggeeks demo.yourdomain.com
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: traininggeeks
credentials-file: /home/pi/.cloudflared/<TUNNEL-ID>.json
ingress:
  - hostname: demo.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

Run it as a service:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Your demo is now live at `https://demo.yourdomain.com`.

> Alternatives: **Tailscale Funnel** (`tailscale funnel 3000`) for a quick
> `*.ts.net` HTTPS URL, or **nginx + certbot** with a port-forward if you have a
> static IP and prefer self-managed TLS.

### 8. Wire up the GitHub link

In `README.md`, replace `https://YOUR-DEMO-URL` with
`https://demo.yourdomain.com`. People browsing the repo now have a one-click path
to your live data. The demo's landing page (`/login`) shows the **"View Live!"**
explainer; visitors who land on `/` go straight into the read-only app.

### Verifying the demo is locked down

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://demo.yourdomain.com/            # 200 (public)
curl -s -o /dev/null -w "%{http_code}\n" https://demo.yourdomain.com/settings    # 307 -> /
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://demo.yourdomain.com/api/import  # 403
```

### Backups

Your whole history is the gitignored **`data/`** directory on the Pi. Periodically
copy it somewhere safe (and remember it's also reproducible from intervals.icu).

## C. Federation (optional)

To add friends on other self-hosted instances, point the app at a coordination
directory — the reference instance at `https://directory.traininggeeks.net`,
or your own deployment of
[TrainingGeeks-Directory](https://github.com/arin-jaff/TrainingGeeks-Directory)
(its `DEPLOYMENT.md` has the steps — it can ride the same Pi + tunnel as the
demo; one Cloudflare Tunnel can serve any number of hostnames across any
domains in your account). Set `TG_DIRECTORY_URL` and `TG_PUBLIC_URL` on this
instance, restart, and claim a handle in the **Social** tab.

Note: a `TG_READONLY=1` demo cannot register or send requests (writes are
blocked) — claim your handle from your personal, writable instance. The feed
itself renders fine on the demo.

### Federation heartbeat

So friends see you as online without anyone opening the app, hit the heartbeat
endpoint on a timer. It's authenticated with `TG_SYNC_TOKEN` (same as sync).

```bash
sudo nano /etc/systemd/system/tg-heartbeat.service
# [Unit]
# Description=TrainingGeeks federation heartbeat
# [Service]
# Type=oneshot
# ExecStart=/usr/bin/curl -fsS -X POST -H "Authorization: Bearer <TG_SYNC_TOKEN>" http://localhost:3000/api/federation/heartbeat

sudo nano /etc/systemd/system/tg-heartbeat.timer
# [Unit]
# Description=Send a federation heartbeat every minute
# [Timer]
# OnBootSec=1min
# OnUnitActiveSec=60
# [Install]
# WantedBy=timers.target

sudo systemctl daemon-reload
sudo systemctl enable --now tg-heartbeat.timer
```

The endpoint no-ops when no directory is configured or no handle is registered,
so it's safe to enable before you set things up.
