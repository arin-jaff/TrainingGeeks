import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionToken, verifySessionToken } from "./session.js";

const SECRET = "test-secret";

test("a freshly signed token verifies", async () => {
  const token = await createSessionToken(SECRET, 3600);
  assert.equal(await verifySessionToken(token, SECRET), true);
});

test("a tampered signature is rejected", async () => {
  const token = await createSessionToken(SECRET, 3600);
  const [data] = token.split(".");
  assert.equal(await verifySessionToken(`${data}.deadbeef`, SECRET), false);
});

test("a token signed with another secret is rejected", async () => {
  const token = await createSessionToken(SECRET, 3600);
  assert.equal(await verifySessionToken(token, "other-secret"), false);
});

test("an expired token is rejected", async () => {
  const token = await createSessionToken(SECRET, -1);
  assert.equal(await verifySessionToken(token, SECRET), false);
});

test("missing / malformed tokens are rejected", async () => {
  assert.equal(await verifySessionToken(undefined, SECRET), false);
  assert.equal(await verifySessionToken("garbage", SECRET), false);
});
