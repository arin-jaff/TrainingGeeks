/**
 * Backup archive layout + validation. Pure (no fs, no db) so the entry rules
 * that guard the restore trust boundary are testable on their own.
 *
 * A backup is a gzipped tar containing:
 *   manifest.json      — format marker and creation time
 *   traininggeeks.db   — `VACUUM INTO` snapshot of the live database
 *   uploads/…          — activity attachments (TG_UPLOADS_PATH)
 *   fit/raw/…          — original FIT files as imported
 */

export const BACKUP_FORMAT = "traininggeeks-backup";
export const BACKUP_VERSION = 1;

export const MANIFEST_ENTRY = "manifest.json";
export const DB_ENTRY = "traininggeeks.db";
export const UPLOADS_ENTRY = "uploads";
export const FIT_ENTRY = "fit/raw";

/** Upload ceiling: a full archive is DB + photos + every raw FIT ever imported. */
export const MAX_ARCHIVE_BYTES = 4 * 1024 * 1024 * 1024;
/** Sanity ceiling on member count — a real library is tens of thousands of files. */
export const MAX_ENTRIES = 200_000;

export interface BackupManifest {
  format: string;
  version: number;
  createdAt: string;
}

/** tar prints members as "./x", "x/", "./" — reduce to a plain relative path. */
export function normalizeEntry(name: string): string {
  return name.replace(/^\.[/\\]+/, "").replace(/[/\\]+$/, "");
}

function allowed(name: string): boolean {
  return (
    name === DB_ENTRY ||
    name === MANIFEST_ENTRY ||
    name === "fit" ||
    name === UPLOADS_ENTRY ||
    name.startsWith(`${UPLOADS_ENTRY}/`) ||
    name === FIT_ENTRY ||
    name.startsWith(`${FIT_ENTRY}/`)
  );
}

/**
 * Check a tar listing before extracting it. Returns an error message, or null
 * when every member is a relative path inside a slot we own — no absolute
 * paths, no drive letters, no ".." segments that could escape the staging dir.
 */
export function validateEntries(names: string[]): string | null {
  if (names.length === 0) return "Archive is empty.";
  if (names.length > MAX_ENTRIES) {
    return `Archive has too many entries (limit ${MAX_ENTRIES.toLocaleString()}).`;
  }

  let hasDb = false;
  for (const raw of names) {
    const name = normalizeEntry(raw);
    if (!name) continue; // "./" — the archive root itself
    if (name.startsWith("/") || name.startsWith("\\") || /^[a-zA-Z]:/.test(name)) {
      return `Archive contains an absolute path: ${raw}`;
    }
    if (name.split(/[/\\]/).some((seg) => seg === "..")) {
      return `Archive contains a parent-directory path: ${raw}`;
    }
    if (!allowed(name)) return `Archive contains an unexpected entry: ${raw}`;
    if (name === DB_ENTRY) hasDb = true;
  }

  if (!hasDb) return `Archive is missing ${DB_ENTRY}.`;
  return null;
}

const TYPE_LABEL: Record<string, string> = {
  l: "symbolic link",
  h: "hard link",
  c: "character device",
  b: "block device",
  p: "named pipe",
  s: "socket",
};

/**
 * Check member TYPES, from `tar -tvzf`, whose every line starts with a mode
 * string (`-rw-r--r--`, `drwxr-xr-x`, `lrwxr-xr-x`) in both bsdtar and GNU tar.
 *
 * Names alone are not enough: a member named `uploads/x` that is a symlink to
 * `/etc` sits inside an allowed slot and contains no "..", yet a later member
 * `uploads/x/passwd` would then be written through it, outside the staging
 * directory. A backup only ever holds regular files and directories, so
 * anything else is rejected outright rather than trusted to tar's own
 * hardening, which differs by implementation and version.
 */
export function validateEntryTypes(verboseLines: string[]): string | null {
  for (const line of verboseLines) {
    const type = line[0];
    if (!type || type === " ") continue;
    if (type !== "-" && type !== "d") {
      return `Archive contains a ${TYPE_LABEL[type] ?? "special"} entry; a backup holds only files and folders.`;
    }
  }
  return null;
}

/** Parse manifest.json, returning null when it isn't one of ours. */
export function parseManifest(text: string): BackupManifest | null {
  try {
    const m = JSON.parse(text) as Partial<BackupManifest>;
    if (m?.format !== BACKUP_FORMAT) return null;
    if (typeof m.createdAt !== "string" || !m.createdAt) return null;
    return { format: m.format, version: Number(m.version) || 1, createdAt: m.createdAt };
  } catch {
    return null;
  }
}
