export const config = { runtime: 'edge' };

import { buildAuthorizeUrl } from '../_lib/adobeAuth.js';
import { requiredEnv } from '../_lib/env.js';
import { serializeCookie } from '../_lib/cookies.js';

const STATE_COOKIE = 'lr_oauth_state';

/** Redirects the browser to Adobe's consent screen. The random `state` value round-trips through a short-lived cookie so the callback can reject a forged/replayed redirect. */
export default async function handler(): Promise<Response> {
  const clientId = requiredEnv('ADOBE_CLIENT_ID');
  const redirectUri = requiredEnv('ADOBE_REDIRECT_URI');

  const state = crypto.randomUUID();
  const authorizeUrl = buildAuthorizeUrl(clientId, redirectUri, state);

  const headers = new Headers({ Location: authorizeUrl });
  headers.append('Set-Cookie', serializeCookie(STATE_COOKIE, state, { maxAgeSeconds: 600 }));
  return new Response(null, { status: 302, headers });
}
