import type { DB } from "../db/client.js";
import { getSetting, setSetting } from "../db/repo.js";
import { generateKeypair, signerFrom, type Signer, type StoredKeypair } from "./crypto.js";

const K_PUB = "federation_public_key";
const K_PRIV = "federation_private_key_der";
const K_HANDLE = "federation_handle";
const K_PUBLIC_URL = "federation_public_url";

/**
 * Load this instance's keypair, generating and persisting one on first use.
 * The private key never leaves the box — it lives only in app_setting.
 */
export function loadOrCreateKeypair(db: DB): StoredKeypair {
  const publicKey = getSetting(db, K_PUB);
  const privateKeyDer = getSetting(db, K_PRIV);
  if (publicKey && privateKeyDer) return { publicKey, privateKeyDer };

  const kp = generateKeypair();
  setSetting(db, K_PUB, kp.publicKey);
  setSetting(db, K_PRIV, kp.privateKeyDer);
  return kp;
}

export function getSigner(db: DB): Signer {
  return signerFrom(loadOrCreateKeypair(db));
}

export function getHandle(db: DB): string | null {
  return getSetting(db, K_HANDLE);
}

export function setHandle(db: DB, handle: string): void {
  setSetting(db, K_HANDLE, handle);
}

export function savePublicUrl(db: DB, url: string): void {
  setSetting(db, K_PUBLIC_URL, url.replace(/\/+$/, ""));
}
