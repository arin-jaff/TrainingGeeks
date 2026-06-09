import {
  createHash,
  createPrivateKey,
  generateKeyPairSync,
  sign as edSign,
} from "node:crypto";

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
