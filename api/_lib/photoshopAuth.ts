import { readEnv, requiredEnv } from './env.js';

// Same Adobe IMS token host Lightroom uses, but a different grant — the
// Photoshop API credential is "OAuth Server-to-Server" (no end-user login,
// no redirect/callback), so this is a machine-to-machine client_credentials
// exchange, not the authorization_code flow in adobeAuth.ts.
const ADOBE_TOKEN_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';

interface PhotoshopTokenResponse {
  access_token: string;
  expires_in: number; // seconds
  token_type: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

// Best-effort in-memory cache across warm invocations of the same Edge
// Function instance — each cold start re-fetches, which is fine since this
// is a cheap call, but avoids a redundant token fetch per request on a warm
// instance.
let cached: CachedToken | null = null;

/**
 * Client ID + Client Secret + scopes come straight from the "OAuth
 * Server-to-Server" credential Adobe generates when you add the Photoshop
 * API product to a Developer Console project — copy them verbatim into
 * ADOBE_PS_CLIENT_ID / ADOBE_PS_CLIENT_SECRET / ADOBE_PS_SCOPES.
 */
export async function getPhotoshopAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const clientId = requiredEnv('ADOBE_PS_CLIENT_ID');
  const clientSecret = requiredEnv('ADOBE_PS_CLIENT_SECRET');
  const scope = readEnv('ADOBE_PS_SCOPES') ?? 'openid,AdobeID,firefly_api,ff_apis';

  const res = await fetch(ADOBE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    }),
  });
  if (!res.ok) {
    throw new Error(`Adobe IMS token endpoint returned ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as PhotoshopTokenResponse;

  cached = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cached.accessToken;
}

/** The two headers every Photoshop API / Firefly Services call needs, beyond the token. */
export async function photoshopAuthHeaders(): Promise<Record<string, string>> {
  const token = await getPhotoshopAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    'x-api-key': requiredEnv('ADOBE_PS_CLIENT_ID'),
  };
}
