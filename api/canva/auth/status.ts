export const config = { runtime: 'edge' };

import { parseCookies } from '../../_lib/cookies.js';
import { decryptSession } from '../../_lib/session.js';
import { requiredEnv } from '../../_lib/env.js';
import type { StoredCanvaSession } from '../../_lib/canvaAuth.js';
import { CANVA_SESSION_COOKIE } from '../../_lib/canvaSession.js';

/** Lets the frontend ask "are we connected to Canva?" without ever handling the actual tokens. */
export default async function handler(req: Request): Promise<Response> {
  const cookies = parseCookies(req.headers.get('cookie'));
  const raw = cookies[CANVA_SESSION_COOKIE];
  if (!raw) return json({ connected: false });

  const sessionSecret = requiredEnv('SESSION_SECRET');
  const session = await decryptSession<StoredCanvaSession>(sessionSecret, raw);
  if (!session) return json({ connected: false });

  return json({ connected: true, expiresAt: session.expiresAt, hasRefreshToken: !!session.refreshToken });
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}
