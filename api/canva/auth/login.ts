export const config = { runtime: 'edge' };

import { buildAuthorizeUrl, generatePkcePair } from '../../_lib/canvaAuth.js';
import { requiredEnv, readEnv } from '../../_lib/env.js';
import { serializeCookie } from '../../_lib/cookies.js';

/** Reports shape, never content — catches the exact copy-paste-added-a-newline bug the redirect URI had, without ever printing a secret. */
function envHealth(name: string): { present: boolean; length: number; hasSurroundingWhitespace: boolean } {
  const value = readEnv(name);
  if (!value) return { present: false, length: 0, hasSurroundingWhitespace: false };
  return { present: true, length: value.length, hasSurroundingWhitespace: value !== value.trim() };
}

const STATE_COOKIE = 'canva_oauth_state';
const VERIFIER_COOKIE = 'canva_pkce_verifier';

/** Redirects to Canva's consent screen. Both the CSRF `state` and the PKCE code_verifier round-trip through short-lived cookies so the callback can validate the redirect and complete the exchange. */
export default async function handler(req: Request): Promise<Response> {
  const clientId = requiredEnv('CANVA_CLIENT_ID');
  const redirectUri = requiredEnv('CANVA_REDIRECT_URI');

  const state = crypto.randomUUID();
  const { verifier, challenge } = await generatePkcePair();
  const authorizeUrl = buildAuthorizeUrl({ clientId, redirectUri, state, codeChallenge: challenge });

  // TEMPORARY: lets us confirm what CANVA_REDIRECT_URI actually resolves to
  // on the live deployment without guessing from screenshots of a
  // collapsed address bar. Remove once the OAuth redirect_uri mismatch is
  // resolved — this reveals no secret (client secret is never in here).
  if (new URL(req.url).searchParams.get('debug') === '1') {
    return new Response(
      JSON.stringify(
        {
          redirectUri,
          clientId,
          authorizeUrl,
          clientSecretHealth: envHealth('CANVA_CLIENT_SECRET'),
          sessionSecretHealth: envHealth('SESSION_SECRET'),
        },
        null,
        2,
      ),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const headers = new Headers({ Location: authorizeUrl });
  headers.append('Set-Cookie', serializeCookie(STATE_COOKIE, state, { maxAgeSeconds: 600 }));
  headers.append('Set-Cookie', serializeCookie(VERIFIER_COOKIE, verifier, { maxAgeSeconds: 600 }));
  return new Response(null, { status: 302, headers });
}
