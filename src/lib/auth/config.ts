/**
 * Single-user auth config. When TG_PASSWORD is unset, auth is DISABLED so the
 * app runs openly for local development. Set TG_PASSWORD (and ideally
 * TG_SESSION_SECRET) to gate access when serving on a reachable box.
 */

export const SESSION_COOKIE = "tg_session";
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

export function getPassword(): string | null {
  const p = process.env.TG_PASSWORD;
  return p && p.length > 0 ? p : null;
}

export function authEnabled(): boolean {
  return getPassword() !== null;
}

/** Optional bearer token allowing the sync daemon to call /api/sync. */
export function getSyncToken(): string | null {
  const t = process.env.TG_SYNC_TOKEN;
  return t && t.length > 0 ? t : null;
}

export function getSecret(): string {
  return (
    process.env.TG_SESSION_SECRET ||
    process.env.TG_PASSWORD ||
    "traininggeeks-insecure-dev-secret"
  );
}
