export const config = { runtime: 'edge' };

import { serializeCookie } from '../../_lib/cookies.js';
import { CANVA_SESSION_COOKIE } from '../../_lib/canvaSession.js';

/** Clears the local session cookie only — does not revoke the token at Canva, same "disconnect this browser, not revoke access" scope as the Lightroom logout. */
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const appUrl = new URL('/', url.origin);
  const headers = new Headers({ Location: appUrl.toString() });
  headers.append('Set-Cookie', serializeCookie(CANVA_SESSION_COOKIE, '', { maxAgeSeconds: 0 }));
  return new Response(null, { status: 302, headers });
}
