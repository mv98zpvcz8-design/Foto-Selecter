// AES-256-GCM via the standard Web Crypto API (available in both Vercel's
// Edge runtime and modern Node) — no extra crypto dependency needed. This
// is what turns the session cookie's content unreadable/untamperable
// without the server's SESSION_SECRET, even though the cookie itself
// isn't marked any differently from a plain one in transit.
const ALGO = 'AES-GCM';

async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, ALGO, false, ['encrypt', 'decrypt']);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padLength = (4 - (value.length % 4)) % 4;
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encryptSession(secret: string, payload: unknown): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, data);
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

/** Returns null for anything missing, malformed, or tampered with — callers treat that the same as "not logged in". */
export async function decryptSession<T>(secret: string, value: string): Promise<T | null> {
  try {
    const [ivPart, dataPart] = value.split('.');
    if (!ivPart || !dataPart) return null;
    const key = await deriveKey(secret);
    const iv = fromBase64Url(ivPart);
    const ciphertext = fromBase64Url(dataPart);
    const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    return null;
  }
}
