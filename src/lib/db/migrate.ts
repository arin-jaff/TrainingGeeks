import type { DatabaseSync } from "node:sqlite";
import { MIGRATIONS } from "./migrations.js";

/**
 * Apply any not-yet-applied migrations in id order. Idempotent: safe to call
 * on every connection open.
 */
export function runMigrations(db: DatabaseSync): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);

  const applied = new Set(
    (
      db.prepare("SELECT id FROM _migrations").all() as unknown as {
        id: number;
      }[]
    ).map((r) => r.id),
  );

  const ordered = [...MIGRATIONS].sort((a, b) => a.id - b.id);
  const insert = db.prepare("INSERT INTO _migrations (id, name) VALUES (?, ?)");

  for (const m of ordered) {
    if (applied.has(m.id)) continue;
    db.exec("BEGIN");
    try {
      db.exec(m.sql);
      insert.run(m.id, m.name);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw new Error(
        `Migration ${m.id} (${m.name}) failed: ${(err as Error).message}`,
      );
    }
  }
}
