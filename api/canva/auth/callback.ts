export const config = { runtime: 'edge' };

import { exchangeCodeForTokens, type StoredCanvaSession } from '../../_lib/canvaAuth.js';
import { requiredEnv } from '../../_lib/env.js';
import { parseCookies, serializeCookie } from '../../_lib/cookies.js';
import { encryptSession } from '../../_lib/session.js';
import { CANVA_SESSION_COOKIE } from '../../_lib/canvaSession.js';

const STATE_COOKIE = 'canva_oauth_state';
const VERIFIER_COOKIE = 'canva_pkce_verifier';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Canva redirects here after the user approves/denies access. Exchanges the one-time code for tokens server-side (needs the client secret + PKCE verifier, neither ever exposed to the browser) and stores them in an encrypted, HttpOnly cookie — same pattern as api/auth/callback.ts for Lightroom. */
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const cookies = parseCookies(req.headers.get('cookie'));
  const expectedState = cookies[STATE_COOKIE];
  const codeVerifier = cookies[VERIFIER_COOKIE];

  const appUrl = new URL('/', url.origin);
  const clearTempCookies = [
    serializeCookie(STATE_COOKIE, '', { maxAgeSeconds: 0 }),
    serializeCookie(VERIFIER_COOKIE, '', { maxAgeSeconds: 0 }),
  ];

  if (error) {
    appUrl.searchParams.set('canva_error', error);
    return redirectWithCookies(appUrl, clearTempCookies);
  }
  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    appUrl.searchParams.set('canva_error', 'invalid_state');
    return redirectWithCookies(appUrl, clearTempCookies);
  }

  try {
    const clientId = requiredEnv('CANVA_CLIENT_ID');
    const clientSecret = requiredEnv('CANVA_CLIENT_SECRET');
    const redirectUri = requiredEnv('CANVA_REDIRECT_URI');
    const sessionSecret = requiredEnv('SESSION_SECRET');

    const tokens = await exchangeCodeForTokens({ clientId, clientSecret, redirectUri, code, codeVerifier });
    const session: StoredCanvaSession = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
    const sessionValue = await encryptSession(sessionSecret, session);

    const headers = new Headers({ Location: appUrl.toString() });
    headers.append('Set-Cookie', serializeCookie(CANVA_SESSION_COOKIE, sessionValue, { maxAgeSeconds: SESSION_MAX_AGE_SECONDS }));
    for (const cookie of clearTempCookies) headers.append('Set-Cookie', cookie);
    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error('Canva OAuth callback failed:', err);
    appUrl.searchParams.set('canva_error', 'token_exchange_failed');
    return redirectWithCookies(appUrl, clearTempCookies);
  }
}

function redirectWithCookies(target: URL, cookies: string[]): Response {
  const headers = new Headers({ Location: target.toString() });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}
