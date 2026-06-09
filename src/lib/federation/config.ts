import type { DB } from "../db/client.js";
import { getSetting } from "../db/repo.js";

/**
 * The directory this instance federates through. Unset = federation is off
 * (pure local / peer-to-peer). Set TG_DIRECTORY_URL to the coordination server.
 */
export function directoryUrl(): string | null {
  const u = process.env.TG_DIRECTORY_URL;
  return u && u.length > 0 ? u.replace(/\/+$/, "") : null;
}

export function federationEnabled(): boolean {
  return directoryUrl() !== null;
}

/**
 * This instance's own public base URL, so friends can reach it. Prefer the
 * TG_PUBLIC_URL env; fall back to a value the user saved in the Friends panel.
 */
export function publicUrl(db: DB): string | null {
  const env = process.env.TG_PUBLIC_URL;
  if (env && env.length > 0) return env.replace(/\/+$/, "");
  return getSetting(db, "federation_public_url");
}
