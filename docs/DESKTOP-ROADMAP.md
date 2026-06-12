# TrainingGeeks Desktop — packaging roadmap

The plan for shipping TrainingGeeks as an installable application — macOS
first — distributed from this repo's GitHub Releases as the first
**early-access build of canonical TrainingGeeks**. Written June 2026, when the
web app is feature-complete through the social/federation phase.

## 1. What we are actually packaging

TrainingGeeks is not a static frontend: it is a Next.js **server** (React
Server Components, server actions, `node:sqlite`, filesystem access for FIT
files and image attachments). A desktop app therefore has to ship a runtime
able to run that server locally, with a window pointed at it. Three ways to do
that:

| Option | How | Pros | Cons |
| --- | --- | --- | --- |
| **A. Tauri v2 + Node sidecar** (recommended) | Rust shell + native WKWebView; a bundled Node runtime runs the existing `next start` (standalone build) as a managed child process; the window loads `http://127.0.0.1:<port>` | Small shell (~5 MB + ~45 MB Node), native look, first-class auto-updater, matches the long-stated Tauri direction; zero changes to app behavior | Two runtimes to orchestrate; bundled Node must survive notarization (hardened-runtime entitlements) |
| B. Electron | Chromium + Node in one binary; same child-process server | Most-trodden path, single runtime, `node:sqlite` available (Electron ≥ 35 ships Node 22+) | ~120 MB download, heavier RAM, less native feel |
| C. Native Tauri port | Static UI + the pure `src/lib` logic re-hosted behind Tauri commands (Rust/TS bridge) | Smallest, fastest, most "real app" | A rewrite of every server component/action — months, not weeks |

**Decision: Option A.** It reuses the entire app unchanged, keeps the download
reasonable, and the pure `src/lib/{fit,metrics,db,connectors,federation}`
layering keeps Option C open later. Option B is the documented fallback if
sidecar notarization fights back — the M0/M3 work below is identical either
way, so switching costs little.

## 2. Where it lives

**This repo, a `desktop/` directory — not a separate repo or branch.**

- The shell versions in lockstep with the app; a separate repo would drift,
  and a synced branch (the readonly model) exists to *change* app behavior —
  packaging changes none.
- `desktop/` holds the Tauri project (`src-tauri/`, icons, updater config);
  releases are built by a workflow that triggers on `desktop-v*` tags, so
  normal pushes never pay the (slow, macOS-runner) packaging cost.
- The Pi/readonly pipeline is untouched.

## 3. Milestones

### M0 — Server groundwork (app repo, no Tauri yet)

Everything here also benefits plain self-hosters.

1. **Standalone build**: `output: "standalone"` in `next.config.ts`; verify
   `node .next/standalone/server.js` serves the app with static assets copied
   in (`.next/static`, `public/`). Confirm `sharp`/native deps resolve from
   the standalone `node_modules`.
2. **Boot module** (`scripts/desktop-server.mjs`): pick a free port, set
   per-platform defaults — `TG_DB_PATH` →
   `~/Library/Application Support/TrainingGeeks/traininggeeks.db` (macOS),
   uploads dir beside it — print `READY <port>` on listen. The shell parses
   that line.
3. **Configurable file storage**: today uploads resolve relative to CWD;
   route them through one `dataDir()` helper honoring `TG_DATA_DIR`.
4. **In-process sync scheduler**: when `TG_DESKTOP=1`, run the intervals.icu
   sync + federation heartbeat on an internal timer (the desktop app has no
   systemd). Reuses `scripts/sync-daemon.mjs` logic inside the server.
5. **Health endpoint**: tiny `GET /api/health` (no auth) for the shell's
   ready/alive polling.

*Exit criteria: `node scripts/desktop-server.mjs` on a clean machine creates
the data dir, serves the app, syncs on its own.*

### M1 — The shell (Tauri v2)

1. Scaffold `desktop/src-tauri` (Rust stable, Tauri v2). Window: 1280x800
   default, remembered size/position, min 900x600.
2. **Sidecar packaging**: bundle the Node binary (per-arch) + the standalone
   server output as Tauri resources; spawn on launch, wait for `READY <port>`,
   then navigate the webview. Kill the child on quit (and adopt/replace an
   orphan via a single-instance lock + pidfile).
3. **Native menu**: About (version), Check for Updates, standard Edit/Window
   menus (copy/paste must work), "Open Data Folder" item.
4. **App identity**: existing logo → `.icns` set; bundle id
   `com.traininggeeks.app`; window title "TrainingGeeks".
5. Failure UX: if the server dies or the port never readies, show a native
   dialog with the log path instead of a blank window.

*Exit criteria: `tauri build` produces a .app that cold-starts to the Home
page in under ~3 s with data in Application Support.*

### M2 — macOS polish

1. **.fit file association + drag-drop**: double-clicking a FIT (or dropping
   it on the Dock icon) imports it via the existing import pipeline.
2. **First-run onboarding**: the UX-roadmap B5 empty-state checklist doubles
   as the desktop welcome (connect intervals.icu, import a FIT, set zones).
3. Quality pass: dark-titlebar match with the navy nav, cmd+W closes window
   without killing the server (reopen from Dock), cmd+Q quits cleanly.
4. Optional: "Start at login" toggle (Settings), so sync keeps running.

### M3 — Distribution: early access on GitHub

1. **CI workflow** (`desktop-release.yml`): on `desktop-v*` tags, macOS
   runner builds **universal** (aarch64 + x86_64) dmg via `tauri build`,
   uploads to a GitHub Release marked **Pre-release**.
2. **Signing strategy, staged**:
   - *Early access (now)*: ad-hoc signed. README documents the one-time
     bypass (right-click → Open, or `xattr -dr com.apple.quarantine`).
     Honest label: "unsigned early-access build".
   - *Beta (next)*: Apple Developer ID ($99/yr) + hardened runtime +
     notarization in CI (the bundled Node binary needs the
     `com.apple.security.cs.allow-jit`-free entitlement set; sidecars must be
     signed individually — this is the known risk item).
3. **Auto-update**: Tauri updater pointed at GitHub Releases (signed update
   manifests; keep the private key in repo secrets). Early-access builds may
   skip this and just notify "a newer version exists" via the GitHub API.
4. **README**: a Download section — "Download TrainingGeeks for macOS
   (early access)" badge linking to the latest release, with the
   self-host path remaining the documented default.
5. Versioning: app releases stay `vX.Y.Z`; desktop tags `desktop-vX.Y.Z`
   track which app commit they wrap (recorded in the About box).

*Exit criteria: a stranger with a Mac downloads the dmg from GitHub, opens
it, imports a FIT, and sees their dashboard — without reading DEPLOYMENT.md.*

### M4 — After macOS

- **Windows** (NSIS installer; data in `%APPDATA%\TrainingGeeks`) and
  **Linux** (AppImage + .deb) from the same workflow matrix.
- Update channels (stable/edge) once there are users to protect.
- Crash/error reporting stays **opt-in and local-first** (a "reveal log file"
  button, not telemetry) — the privacy stance is the product.
- Revisit Option C (native port) only if the sidecar model shows real limits.

## 4. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Notarizing the bundled Node sidecar | Known-solved in the Tauri ecosystem (sign each binary, correct entitlements); fallback is Electron (M0 unchanged) |
| Port collisions / zombie servers | Ephemeral port + `READY` handshake + single-instance lock + kill-on-quit |
| Native deps (`sharp`, `node:sqlite`) per-arch | Universal build assembles per-arch standalone outputs; `node:sqlite` is built into Node itself |
| Download size expectations | ~90 MB universal dmg is normal for this class of app; document it |
| Auto-update key loss | Updater keypair in repo secrets + offline backup; early access ships without auto-update anyway |
| Two app instances fighting over one SQLite | WAL handles concurrent processes, but the single-instance lock prevents it outright |

## 5. Sequencing & estimate

M0 (1–2 days) → M1 (2–4 days) → M3 early-access lane (1–2 days, unsigned)
→ M2 polish (parallel, ongoing) → M3 notarized lane (1 day once the Apple
Developer account exists) → M4 later.

The fastest credible path to "first early-access version on the repo" is
**M0 → M1 → M3-unsigned**: roughly a week of focused work, nothing blocked on
Apple.

## Field notes from the first early-access build (June 2026)

- The bundle must be **explicitly ad-hoc signed** (`signingIdentity: "-"`);
  without it only the executable is linker-signed, the resource seal is
  missing, and Gatekeeper reports the app as damaged with no Open Anyway
  path.
- **Hardened runtime breaks the bundled Node** (V8 cannot reserve JIT
  memory) unless paired with `com.apple.security.cs.allow-jit` +
  `allow-unsigned-executable-memory` entitlements. Early-access ad-hoc
  builds ship with `hardenedRuntime: false`; the notarized Developer ID
  lane must turn it back on together with those entitlements.
- First-launch UX on current macOS: System Settings > Privacy & Security >
  Open Anyway (right-click Open no longer bypasses Gatekeeper), or
  `xattr -dr com.apple.quarantine`.
