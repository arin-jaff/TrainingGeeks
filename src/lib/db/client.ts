import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { runMigrations } from "./migrate.js";

export type DB = DatabaseSync;

const DEFAULT_DB_PATH = join(process.cwd(), "data", "traininggeeks.db");

/**
 * Open a database at `path`, enforce foreign keys, and run migrations.
 * Use ':memory:' for tests. Pass an explicit path to isolate.
 */
export function openDb(path: string = DEFAULT_DB_PATH): DB {
  if (path !== ":memory:") {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  runMigrations(db);
  return db;
}

// App-wide singleton (server runtime only). Survives dev hot-reload via globalThis.
const globalForDb = globalThis as unknown as { __tgDb?: DB };

export function getDb(): DB {
  if (!globalForDb.__tgDb) {
    globalForDb.__tgDb = openDb(process.env.TG_DB_PATH || DEFAULT_DB_PATH);
  }
  return globalForDb.__tgDb;
}
