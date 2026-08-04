export const config = { runtime: 'edge' };

import { buildAuthorizeUrl, generatePkcePair } from '../../_lib/canvaAuth.js';
import { requiredEnv } from '../../_lib/env.js';
import { serializeCookie } from '../../_lib/cookies.js';

const STATE_COOKIE = 'canva_oauth_state';
const VERIFIER_COOKIE = 'canva_pkce_verifier';

/** Redirects to Canva's consent screen. Both the CSRF `state` and the PKCE code_verifier round-trip through short-lived cookies so the callback can validate the redirect and complete the exchange. */
export default async function handler(): Promise<Response> {
  const clientId = requiredEnv('CANVA_CLIENT_ID');
  const redirectUri = requiredEnv('CANVA_REDIRECT_URI');

  const state = crypto.randomUUID();
  const { verifier, challenge } = await generatePkcePair();
  const authorizeUrl = buildAuthorizeUrl({ clientId, redirectUri, state, codeChallenge: challenge });

  const headers = new Headers({ Location: authorizeUrl });
  headers.append('Set-Cookie', serializeCookie(STATE_COOKIE, state, { maxAgeSeconds: 600 }));
  headers.append('Set-Cookie', serializeCookie(VERIFIER_COOKIE, verifier, { maxAgeSeconds: 600 }));
  return new Response(null, { status: 302, headers });
}
