/**
 * Signed session tokens using the Web Crypto API only, so the same code runs
 * in the Edge middleware and in Node server actions. Token = base64url(payload)
 * + "." + HMAC-SHA256 hex. Payload carries an expiry.
 */

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(
  secret: string,
  maxAgeS: number,
): Promise<string> {
  const payload = { exp: Date.now() + maxAgeS * 1000 };
  const data = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await hmacHex(data, secret);
  return `${data}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | null,
): Promise<boolean> {
  if (!token || !secret) return false;
  const [data, sig] = token.split(".");
  if (!data || !sig) return false;
  const expected = await hmacHex(data, secret);
  if (!timingSafeEqual(sig, expected)) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(data)));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
