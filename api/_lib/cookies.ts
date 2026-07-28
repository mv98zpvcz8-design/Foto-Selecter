export interface CookieOptions {
  /** Omit for a session cookie; 0 deletes it. */
  maxAgeSeconds?: number;
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;
}

/** Builds a Set-Cookie header value. Always HttpOnly + Secure — these cookies only ever carry encrypted tokens or short-lived CSRF state, never anything the frontend JS needs to read directly. */
export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${value}`];
  parts.push(`Path=${options.path ?? '/'}`);
  if (options.maxAgeSeconds != null) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`);
  parts.push('HttpOnly');
  parts.push('Secure');
  return parts.join('; ');
}

export function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}
