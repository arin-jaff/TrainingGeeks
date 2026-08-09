/**
 * One-click backup and restore of the whole data directory.
 *
 * POSIX-only: it shells out to the system `tar` (no new dependency), symlinks
 * the data directories in so a multi-GB library isn't copied to be packed, and
 * renames a file the running process still has open. Windows would need a copy
 * and a closed handle; the desktop build is macOS.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getDb } from "../db/client.js";
import { uploadsRoot } from "../files/storage.js";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  DB_ENTRY,
  FIT_ENTRY,
  MANIFEST_ENTRY,
  UPLOADS_ENTRY,
  parseManifest,
  validateEntries,
  validateEntryTypes,
} from "./archive.js";

/** Tables that must exist for a file to be a TrainingGeeks database at all. */
const REQUIRED_TABLES = ["_migrations", "athlete", "activity", "threshold"];

/** A tar listing of a large library runs to a few MB of text. */
const LIST_MAX_BUFFER = 64 * 1024 * 1024;

export function dbPath(): string {
  return process.env.TG_DB_PATH || join(process.cwd(), "data", "traininggeeks.db");
}

/** Original FIT files, as written by src/lib/import/service.ts. */
export function rawFitRoot(): string {
  return join(process.cwd(), "data", "fit", "raw");
}

export interface BackupArchive {
  /** The .tar.gz to stream back. */
  path: string;
  /** Temp root holding the archive — remove it once the response is done. */
  stage: string;
  filename: string;
  bytes: number;
}

/**
 * Snapshot the database and archive it alongside the user's files.
 *
 * The database is live and in WAL mode, so a byte copy of the .db can be torn.
 * `VACUUM INTO` writes a consistent, already-checkpointed snapshot instead.
 */
export function createBackup(): BackupArchive {
  const stage = mkdtempSync(join(tmpdir(), "tg-backup-"));
  const payload = join(stage, "payload");
  mkdirSync(payload);

  getDb().prepare(`VACUUM INTO ?`).run(join(payload, DB_ENTRY));
  writeFileSync(
    join(payload, MANIFEST_ENTRY),
    JSON.stringify(
      { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: new Date().toISOString() },
      null,
      2,
    ),
  );

  // Symlink the data directories in and let tar dereference them (-h), so a
  // multi-GB library isn't copied twice.
  const uploads = uploadsRoot();
  if (existsSync(uploads)) symlinkSync(uploads, join(payload, UPLOADS_ENTRY), "dir");
  const raw = rawFitRoot();
  if (existsSync(raw)) {
    mkdirSync(join(payload, "fit"));
    symlinkSync(raw, join(payload, FIT_ENTRY), "dir");
  }

  const filename = `traininggeeks-backup-${new Date().toISOString().slice(0, 10)}.tar.gz`;
  const path = join(stage, filename);
  execFileSync("tar", ["-czhf", path, "-C", payload, "."]);
  return { path, stage, filename, bytes: statSync(path).size };
}

export interface RestoreResult {
  ok: boolean;
  error?: string;
  /** Where the previous database was moved. */
  movedTo?: string;
  /** When the archive was taken. */
  createdAt?: string;
  files?: number;
}

/** Open a candidate database read-only and prove it is a sound TrainingGeeks one. */
function inspect(path: string): string | null {
  if (!existsSync(path)) return `Archive is missing ${DB_ENTRY}.`;
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(path, { readOnly: true });
    const rows = db.prepare("PRAGMA integrity_check").all() as { integrity_check?: string }[];
    const verdict = rows[0]?.integrity_check;
    if (verdict !== "ok") {
      return `The database in the archive failed its integrity check (${verdict ?? "unknown"}).`;
    }
    const names = new Set(
      (
        db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
          name: string;
        }[]
      ).map((r) => r.name),
    );
    const missing = REQUIRED_TABLES.filter((t) => !names.has(t));
    if (missing.length) {
      return `That is not a TrainingGeeks database (missing ${missing.join(", ")}).`;
    }
    return null;
  } catch (err) {
    return `Could not open the database in the archive: ${(err as Error).message}`;
  } finally {
    try {
      db?.close();
    } catch {
      // Already closed or never opened.
    }
  }
}

/** Copy an extracted directory over the live one, keeping files it doesn't mention. */
function merge(src: string, dest: string): number {
  if (!existsSync(src)) return 0;
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
  return readdirSync(src, { recursive: true, withFileTypes: true }).filter((d) => d.isFile())
    .length;
}

/**
 * Verify an uploaded archive and swap it in. Nothing on disk is touched until
 * the archive has passed listing, structure and integrity checks; the current
 * database is then moved aside (with its WAL, so the copy stays usable) rather
 * than deleted. The DB handle is a process-wide singleton, so the restored data
 * only loads after a restart — callers must say so.
 */
export function restoreBackup(archivePath: string): RestoreResult {
  const target = dbPath();
  mkdirSync(dirname(target), { recursive: true });
  // Stage next to the database so the swap is a same-filesystem rename.
  const stage = mkdtempSync(join(dirname(target), ".tg-restore-"));
  try {
    let listing: string;
    try {
      listing = execFileSync("tar", ["-tzf", archivePath], {
        encoding: "utf8",
        maxBuffer: LIST_MAX_BUFFER,
      });
    } catch {
      return { ok: false, error: "That file is not a readable .tar.gz archive." };
    }

    const entryError = validateEntries(listing.split("\n").filter(Boolean));
    if (entryError) return { ok: false, error: entryError };

    // Second pass for member types — see validateEntryTypes. Verbose listing is
    // kept separate so the name rules stay parseable without quoting rules.
    let verbose: string;
    try {
      verbose = execFileSync("tar", ["-tvzf", archivePath], {
        encoding: "utf8",
        maxBuffer: LIST_MAX_BUFFER,
      });
    } catch {
      return { ok: false, error: "That file is not a readable .tar.gz archive." };
    }
    const typeError = validateEntryTypes(verbose.split("\n").filter(Boolean));
    if (typeError) return { ok: false, error: typeError };

    try {
      execFileSync("tar", ["-xzf", archivePath, "-C", stage]);
    } catch (err) {
      return { ok: false, error: `Could not extract the archive: ${(err as Error).message}` };
    }

    const manifestPath = join(stage, MANIFEST_ENTRY);
    const manifest = existsSync(manifestPath)
      ? parseManifest(readFileSync(manifestPath, "utf8"))
      : null;
    if (!manifest) {
      return { ok: false, error: "That is not a TrainingGeeks backup (no valid manifest.json)." };
    }

    const dbError = inspect(join(stage, DB_ENTRY));
    if (dbError) return { ok: false, error: dbError };

    // Fold the live WAL back into the main file so the copy we set aside is
    // self-contained, then move database + WAL + SHM together. SQLite derives
    // "<db>-wal" from the file name, so the aside set stays openable as-is.
    try {
      getDb().exec("PRAGMA wal_checkpoint(TRUNCATE);");
    } catch {
      // A failed checkpoint only means the WAL travels with the moved file.
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const aside = `${target}.bak-${stamp}`;
    const moved: string[] = [];
    try {
      for (const suffix of ["", "-wal", "-shm"]) {
        if (existsSync(target + suffix)) {
          renameSync(target + suffix, aside + suffix);
          moved.push(suffix);
        }
      }
      renameSync(join(stage, DB_ENTRY), target);
    } catch (err) {
      // Put the original back: never leave the app with no database at all.
      for (const suffix of moved) {
        try {
          renameSync(aside + suffix, target + suffix);
        } catch {
          // Couldn't undo — the data is still in the .bak- files next to it.
        }
      }
      return { ok: false, error: `Could not swap the database in: ${(err as Error).message}` };
    }

    const files =
      merge(join(stage, UPLOADS_ENTRY), uploadsRoot()) + merge(join(stage, FIT_ENTRY), rawFitRoot());

    return { ok: true, movedTo: aside, createdAt: manifest.createdAt, files };
  } finally {
    cleanup(stage);
  }
}

export function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}
