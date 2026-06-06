import { createHash } from "node:crypto";

/** Stable content hash of decompressed FIT bytes, for idempotent dedupe. */
export function contentHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
