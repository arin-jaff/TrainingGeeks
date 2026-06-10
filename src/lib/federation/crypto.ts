import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as edSign,
  verify as edVerify,
} from "node:crypto";

/** Peer reads must be signed within this clock-skew window (replay guard). */
export const SKEW_MS = 5 * 60 * 1000;

/**
 * Client-side identity crypto. The wire format MUST match the directory's
 * (TrainingGeeks-Directory `src/crypto.ts`): the canonical string binds method,
 * path, timestamp, and a body hash, signed with this instance's Ed25519 key.
 */
export function canonicalString(
  method: string,
  path: string,
  timestampMs: number | string,
  body: string,
): string {
  const bodyHash = createHash("sha256").update(body ?? "").digest("hex");
  return `${method.toUpperCase()}\n${path}\n${timestampMs}\n${bodyHash}`;
}

/** Persisted form of this instance's keypair (stored in app_setting). */
export interface StoredKeypair {
  publicKey: string; // base64url raw Ed25519 public key (JWK `x`)
  privateKeyDer: string; // base64 PKCS8 DER private key
}

export function generateKeypair(): StoredKeypair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" }) as { x: string };
  const der = privateKey.export({ format: "der", type: "pkcs8" }) as Buffer;
  return { publicKey: jwk.x, privateKeyDer: der.toString("base64") };
}

export interface Signer {
  publicKey: string;
  sign(message: string): string; // base64 signature
}

export function signerFrom(kp: StoredKeypair): Signer {
  const priv = createPrivateKey({
    key: Buffer.from(kp.privateKeyDer, "base64"),
    format: "der",
    type: "pkcs8",
  });
  return {
    publicKey: kp.publicKey,
    sign: (message: string) =>
      edSign(null, Buffer.from(message), priv).toString("base64"),
  };
}

export interface VerifyInput {
  key: string | undefined; // base64url Ed25519 public key (X-TG-Key)
  method: string;
  path: string;
  timestamp: string | undefined; // ms (X-TG-Timestamp)
  body: string;
  signature: string | undefined; // base64 (X-TG-Signature)
  now?: number;
}

/** Verify a peer's signed request (signature valid AND within skew). */
export function verifySignature(input: VerifyInput): boolean {
  const { key, method, path, timestamp, body, signature } = input;
  if (!key || !signature || !timestamp) return false;
  const ts = Number(timestamp);
  const now = input.now ?? Date.now();
  if (!Number.isFinite(ts) || Math.abs(now - ts) > SKEW_MS) return false;
  try {
    const pub = createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x: key },
      format: "jwk",
    });
    const msg = Buffer.from(canonicalString(method, path, ts, body));
    return edVerify(null, msg, pub, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}
