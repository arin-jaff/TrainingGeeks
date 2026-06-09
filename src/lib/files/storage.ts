import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Root for user-uploaded activity attachments (gitignored, alongside the DB). */
export function uploadsRoot(): string {
  return process.env.TG_UPLOADS_PATH || join(process.cwd(), "data", "uploads");
}

const IMAGE_MIME = /^image\/(png|jpe?g|gif|webp|avif|heic|heif|bmp|svg\+xml)$/i;
export function isImageMime(mime: string): boolean {
  return IMAGE_MIME.test(mime);
}

/** Strip path separators so a filename can't escape its activity directory. */
export function safeName(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/^\.+/, "").trim();
  return base.slice(0, 200) || "file";
}

/**
 * Persist bytes for an activity under data/uploads/<activityId>/<unique>-<name>
 * and return the absolute stored path. `unique` keeps same-named uploads apart.
 */
export function saveActivityFile(
  activityId: number,
  unique: string,
  filename: string,
  bytes: Uint8Array,
): string {
  const dir = join(uploadsRoot(), String(activityId));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, `${unique}-${safeName(filename)}`);
  writeFileSync(path, bytes);
  return path;
}

export function removeFile(path: string): void {
  try {
    rmSync(path, { force: true });
  } catch {
    // Best-effort: a missing file on disk shouldn't block deleting its row.
  }
}
