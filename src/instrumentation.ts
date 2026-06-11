/**
 * Runs once when the server boots (Next.js instrumentation hook).
 *
 * Desktop mode (TG_DESKTOP=1): the packaged app has no systemd/cron, so the
 * intervals.icu sync and the federation heartbeat run on internal timers,
 * calling the app's own HTTP endpoints exactly like the external daemon
 * (scripts/sync-daemon.mjs) would. No-ops entirely when TG_DESKTOP is unset.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.TG_DESKTOP !== "1") return;
  if (process.env.TG_READONLY === "1") return;

  const port = process.env.PORT || "3000";
  const base = `http://127.0.0.1:${port}`;
  const token = process.env.TG_SYNC_TOKEN ?? "";
  const headers: Record<string, string> = token
    ? { authorization: `Bearer ${token}` }
    : {};

  const syncMinutes = Math.max(5, Number(process.env.TG_SYNC_INTERVAL_MIN ?? 30));

  const sync = () =>
    fetch(`${base}/api/sync`, { method: "POST", headers }).catch(() => {});
  const beat = () =>
    fetch(`${base}/api/federation/heartbeat`, { method: "POST", headers }).catch(
      () => {},
    );

  // First run shortly after boot (give the listener a moment), then steady.
  setTimeout(() => {
    sync();
    beat();
  }, 15_000).unref?.();
  setInterval(sync, syncMinutes * 60_000).unref?.();
  setInterval(beat, 60_000).unref?.();

  console.log(
    `[desktop] internal scheduler armed: sync every ${syncMinutes} min, heartbeat every 60s`,
  );
}
