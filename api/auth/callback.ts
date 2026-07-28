export const config = { runtime: 'edge' };

import { exchangeCodeForTokens, type StoredSession } from '../_lib/adobeAuth.js';
import { requiredEnv } from '../_lib/env.js';
import { parseCookies, serializeCookie } from '../_lib/cookies.js';
import { encryptSession } from '../_lib/session.js';

const STATE_COOKIE = 'lr_oauth_state';
const SESSION_COOKIE = 'lr_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // cookie lifetime, not token lifetime — the stored refresh token is what actually keeps the connection alive

/** Adobe redirects here after the user approves/denies access. Exchanges the one-time code for tokens server-side (needs the client secret, never exposed to the browser) and stores them in an encrypted, HttpOnly cookie. */
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const cookies = parseCookies(req.headers.get('cookie'));
  const expectedState = cookies[STATE_COOKIE];

  const appUrl = new URL('/', url.origin);
  const clearStateCookie = serializeCookie(STATE_COOKIE, '', { maxAgeSeconds: 0 });

  if (error) {
    appUrl.searchParams.set('lightroom_error', error);
    return redirectWithCookie(appUrl, clearStateCookie);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    appUrl.searchParams.set('lightroom_error', 'invalid_state');
    return redirectWithCookie(appUrl, clearStateCookie);
  }

  try {
    const clientId = requiredEnv('ADOBE_CLIENT_ID');
    const clientSecret = requiredEnv('ADOBE_CLIENT_SECRET');
    const redirectUri = requiredEnv('ADOBE_REDIRECT_URI');
    const sessionSecret = requiredEnv('SESSION_SECRET');

    const tokens = await exchangeCodeForTokens({ clientId, clientSecret, redirectUri, code });
    const session: StoredSession = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
    const sessionValue = await encryptSession(sessionSecret, session);

    const headers = new Headers({ Location: appUrl.toString() });
    headers.append(
      'Set-Cookie',
      serializeCookie(SESSION_COOKIE, sessionValue, { maxAgeSeconds: SESSION_MAX_AGE_SECONDS }),
    );
    headers.append('Set-Cookie', clearStateCookie);
    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error('Adobe OAuth callback failed:', err);
    appUrl.searchParams.set('lightroom_error', 'token_exchange_failed');
    return redirectWithCookie(appUrl, clearStateCookie);
  }
}

function redirectWithCookie(target: URL, cookie: string): Response {
  const headers = new Headers({ Location: target.toString() });
  headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}
