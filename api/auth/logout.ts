export const config = { runtime: 'edge' };

import { serializeCookie } from '../_lib/cookies';

const SESSION_COOKIE = 'lr_session';

/** Clears the local session cookie only — does not revoke the token at Adobe (no such endpoint is wired up here), so this is "disconnect this browser" rather than "revoke access", which the user can still do from their own Adobe account security settings if ever needed. */
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const appUrl = new URL('/', url.origin);
  const headers = new Headers({ Location: appUrl.toString() });
  headers.append('Set-Cookie', serializeCookie(SESSION_COOKIE, '', { maxAgeSeconds: 0 }));
  return new Response(null, { status: 302, headers });
}
