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

/**
 * Read-only/demo mode. When TG_READONLY is set, the public landing becomes a
 * "View Live!" page. (The write-blocking enforcement lives on the
 * readonly-mode branch, which layers it on top of this flag.)
 */
export function isReadOnly(): boolean {
  const v = process.env.TG_READONLY;
  return v === "1" || v === "true";
}

/** Optional bearer token allowing the sync daemon to call /api/sync. */
export function getSyncToken(): string | null {
  const t = process.env.TG_SYNC_TOKEN;
  return t && t.length > 0 ? t : null;
}

/**
 * Dedicated secret for signing session cookies. Must be set when auth is
 * enabled — there is no fallback, so a missing secret fails closed rather than
 * signing tokens with a guessable value (the password or a hardcoded string).
 */
export function getSecret(): string | null {
  const s = process.env.TG_SESSION_SECRET;
  return s && s.length > 0 ? s : null;
}

/** Auth is enabled and correctly configured (password + dedicated secret). */
export function authReady(): boolean {
  return authEnabled() && getSecret() !== null;
}
