#!/usr/bin/env node
/**
 * Desktop boot shim: starts the standalone Next.js server with per-platform
 * data locations and prints "READY <port>" once it answers /api/health.
 * The Tauri shell spawns this, parses the READY line, then points its
 * webview at http://127.0.0.1:<port>. Also runnable by hand:
 *
 *   npm run build && node scripts/desktop-server.mjs
 *
 * Env overrides: TG_DATA_DIR, PORT (otherwise a free port is picked),
 * TG_SERVER_DIR (where .next/standalone lives).
 */

import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

/** Per-platform application data directory. */
function defaultDataDir() {
  if (process.env.TG_DATA_DIR) return process.env.TG_DATA_DIR;
  const home = homedir();
  if (process.platform === "darwin")
    return join(home, "Library", "Application Support", "TrainingGeeks");
  if (process.platform === "win32")
    return join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), "TrainingGeeks");
  return join(process.env.XDG_DATA_HOME ?? join(home, ".local", "share"), "traininggeeks");
}

/** Ask the OS for a free port. */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function waitForHealth(port, tries = 120) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const serverDir = process.env.TG_SERVER_DIR ?? join(repoRoot, ".next", "standalone");
const serverJs = join(serverDir, "server.js");
if (!existsSync(serverJs)) {
  console.error(`No standalone build at ${serverJs} — run \`npm run build\` first.`);
  process.exit(1);
}

// Standalone output omits static assets; copy them in on first run so the
// directory is fully self-serving (no-ops once present).
const staticSrc = join(repoRoot, ".next", "static");
const staticDst = join(serverDir, ".next", "static");
if (existsSync(staticSrc) && !existsSync(staticDst)) cpSync(staticSrc, staticDst, { recursive: true });
const publicSrc = join(repoRoot, "public");
const publicDst = join(serverDir, "public");
if (existsSync(publicSrc) && !existsSync(publicDst)) cpSync(publicSrc, publicDst, { recursive: true });

const dataDir = defaultDataDir();
mkdirSync(join(dataDir, "uploads"), { recursive: true });

const port = process.env.PORT ?? String(await freePort());

const child = spawn(process.execPath, [serverJs], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: port,
    HOSTNAME: "127.0.0.1", // local only — never expose the desktop server
    TG_DESKTOP: "1",
    TG_DB_PATH: process.env.TG_DB_PATH ?? join(dataDir, "traininggeeks.db"),
    TG_UPLOADS_PATH: process.env.TG_UPLOADS_PATH ?? join(dataDir, "uploads"),
  },
  stdio: ["ignore", "inherit", "inherit"],
});

// The shell kills this shim; take the server down with us, always.
const stop = () => {
  child.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", (code) => process.exit(code ?? 1));

// Orphan watchdog: if the shell dies without signaling us (force-quit,
// SIGKILL), our parent becomes launchd/init (ppid 1) — shut down then too.
setInterval(() => {
  if (process.ppid === 1) stop();
}, 2000).unref();

if (await waitForHealth(port)) {
  console.log(`READY ${port}`);
} else {
  console.error("Server never became healthy.");
  child.kill("SIGTERM");
  process.exit(1);
}
