import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalString, generateKeypair, signerFrom, verifySignature } from "./crypto";

// The app and the directory MUST produce the same canonical string, or signed
// federation requests won't verify. This frozen vector matches the directory's
// (TrainingGeeks-Directory CONFORMANCE.md / src/crypto.test.ts). If this test
// fails, the two have drifted — fix it before shipping.
test("canonical string matches the directory conformance vector", () => {
  const s = canonicalString("POST", "/v1/register", 1700000000000, '{"handle":"arin"}');
  assert.equal(
    s,
    "POST\n/v1/register\n1700000000000\n" +
      "fa36b78cd8ea6656079d4c5353632e3f2c02abe436de7c6065afcedb8b539406",
  );
});

test("sign then verify round-trips (a peer would accept this)", () => {
  const kp = generateKeypair();
  const signer = signerFrom(kp);
  const now = 1_700_000_000_000;
  const msg = canonicalString("GET", "/api/federation/v1/calendar", now, "");
  const signature = signer.sign(msg);
  assert.equal(
    verifySignature({
      key: signer.publicKey,
      method: "GET",
      path: "/api/federation/v1/calendar",
      timestamp: String(now),
      body: "",
      signature,
      now,
    }),
    true,
  );
});

test("a tampered path fails verification", () => {
  const kp = generateKeypair();
  const signer = signerFrom(kp);
  const now = 1_700_000_000_000;
  const signature = signer.sign(canonicalString("GET", "/api/federation/v1/calendar", now, ""));
  assert.equal(
    verifySignature({
      key: signer.publicKey,
      method: "GET",
      path: "/api/federation/v1/pmc",
      timestamp: String(now),
      body: "",
      signature,
      now,
    }),
    false,
  );
});
