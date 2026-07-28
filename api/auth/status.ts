export const config = { runtime: 'edge' };

import { parseCookies } from '../_lib/cookies';
import { decryptSession } from '../_lib/session';
import { requiredEnv } from '../_lib/env';
import type { StoredSession } from '../_lib/adobeAuth';

const SESSION_COOKIE = 'lr_session';

/** Lets the frontend ask "are we connected to Lightroom?" without ever handling the actual tokens — those stay server-side inside the encrypted cookie. */
export default async function handler(req: Request): Promise<Response> {
  const cookies = parseCookies(req.headers.get('cookie'));
  const raw = cookies[SESSION_COOKIE];
  if (!raw) return json({ connected: false });

  const sessionSecret = requiredEnv('SESSION_SECRET');
  const session = await decryptSession<StoredSession>(sessionSecret, raw);
  if (!session) return json({ connected: false });

  return json({ connected: true, expiresAt: session.expiresAt, hasRefreshToken: !!session.refreshToken });
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}
