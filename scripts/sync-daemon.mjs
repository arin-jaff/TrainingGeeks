#!/usr/bin/env node
/**
 * Self-hosted auto-sync daemon. Periodically asks the running app to pull from
 * intervals.icu. Run alongside the server (or from launchd/cron/systemd):
 *
 *   TG_SYNC_TOKEN=secret TG_SYNC_INTERVAL_MIN=30 node scripts/sync-daemon.mjs
 *
 * Set the same TG_SYNC_TOKEN on the server so the daemon may bypass auth.
 * If the server has no password (TG_PASSWORD unset), the token is optional.
 */

const url = process.env.TG_URL ?? "http://localhost:3000";
const minutes = Number(process.env.TG_SYNC_INTERVAL_MIN ?? 30);
const token = process.env.TG_SYNC_TOKEN ?? "";

async function tick() {
  try {
    const res = await fetch(`${url}/api/sync`, {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    const body = await res.json().catch(() => ({}));
    console.log(new Date().toISOString(), res.status, JSON.stringify(body));
  } catch (err) {
    console.error(new Date().toISOString(), "sync failed:", err.message);
  }
}

console.log(`sync daemon -> ${url} every ${minutes} min`);
tick();
setInterval(tick, Math.max(1, minutes) * 60_000);
