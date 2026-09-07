import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEntry,
  parseManifest,
  validateEntries,
  validateEntryTypes,
  MAX_ENTRIES,
} from "./archive.js";

const GOOD = [
  "./",
  "./manifest.json",
  "./traininggeeks.db",
  "./uploads/",
  "./uploads/12/abc-summit.jpg",
  "./fit/",
  "./fit/raw/",
  "./fit/raw/a1b2.fit",
];

test("normalizeEntry strips tar's ./ prefix and trailing slash", () => {
  assert.equal(normalizeEntry("./uploads/12/a.jpg"), "uploads/12/a.jpg");
  assert.equal(normalizeEntry("./uploads/"), "uploads");
  assert.equal(normalizeEntry("./"), "");
  assert.equal(normalizeEntry("traininggeeks.db"), "traininggeeks.db");
});

test("a well-formed listing passes", () => {
  assert.equal(validateEntries(GOOD), null);
});

test("path traversal is rejected", () => {
  for (const bad of [
    "../../etc/passwd",
    "./uploads/../../etc/passwd",
    "uploads/..",
    "fit/raw/..\\..\\windows\\system32",
  ]) {
    const err = validateEntries([...GOOD, bad]);
    assert.match(err ?? "", /parent-directory/, `expected ${bad} to be rejected`);
  }
});

test("absolute paths are rejected", () => {
  for (const bad of ["/etc/passwd", "\\\\server\\share\\x", "C:/Windows/system32"]) {
    const err = validateEntries([...GOOD, bad]);
    assert.match(err ?? "", /absolute path/, `expected ${bad} to be rejected`);
  }
});

test("entries outside the known slots are rejected", () => {
  assert.match(validateEntries([...GOOD, "node_modules/x.js"]) ?? "", /unexpected entry/);
  assert.match(validateEntries([...GOOD, "fit/other/x.fit"]) ?? "", /unexpected entry/);
});

test("an archive without the database is rejected", () => {
  assert.match(
    validateEntries(["./manifest.json", "./uploads/1/a.jpg"]) ?? "",
    /missing traininggeeks\.db/,
  );
});

test("empty and oversized listings are rejected", () => {
  assert.match(validateEntries([]) ?? "", /empty/);
  const many = Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => `uploads/${i}`);
  assert.match(validateEntries(["traininggeeks.db", ...many]) ?? "", /too many entries/);
});

test("only regular files and directories may be restored", () => {
  // Real `tar -tvzf` lines: bsdtar on the left of the name, GNU tar the same
  // leading mode string. A symlink inside an allowed slot passes every name
  // rule, so the type check is the thing that stops it.
  const clean = [
    "drwxr-xr-x  0 arin staff       0 Aug  9 12:00 ./",
    "-rw-r--r--  0 arin staff  131072 Aug  9 12:00 ./traininggeeks.db",
    "-rw-r--r--  0 arin staff     120 Aug  9 12:00 ./manifest.json",
  ];
  assert.equal(validateEntryTypes(clean), null);

  const symlinked = [
    ...clean,
    "lrwxr-xr-x  0 arin staff       0 Aug  9 12:00 ./uploads -> /etc",
    "-rw-r--r--  0 arin staff      10 Aug  9 12:00 ./uploads/passwd",
  ];
  assert.match(validateEntryTypes(symlinked) ?? "", /symbolic link/);
  assert.equal(
    validateEntries(["traininggeeks.db", "uploads", "uploads/passwd"]),
    null,
    "the name rules alone let this through — hence the type pass",
  );

  assert.match(
    validateEntryTypes([...clean, "hrw-r--r--  0 arin staff 0 Aug  9 12:00 ./uploads/hard"]) ?? "",
    /hard link/,
  );
});

test("parseManifest accepts ours and rejects everything else", () => {
  const ok = parseManifest(
    JSON.stringify({ format: "traininggeeks-backup", version: 1, createdAt: "2026-08-09T00:00:00Z" }),
  );
  assert.equal(ok?.createdAt, "2026-08-09T00:00:00Z");
  assert.equal(parseManifest("{}"), null);
  assert.equal(parseManifest("not json"), null);
  assert.equal(parseManifest(JSON.stringify({ format: "other", createdAt: "x" })), null);
  assert.equal(parseManifest(JSON.stringify({ format: "traininggeeks-backup" })), null);
});
