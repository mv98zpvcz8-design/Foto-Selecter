// Adobe's common IMS (Identity Management System) OAuth endpoints — shared
// across most Adobe developer APIs, not Lightroom-specific.
export const ADOBE_AUTHORIZE_URL = 'https://ims-na1.adobelogin.com/ims/authorize/v2';
export const ADOBE_TOKEN_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';

// Must match exactly what's configured for the "Lightroom Services" API on
// the Adobe Developer Console credential (visible on its Credentials page)
// — lr_partner_rendition_apis is required for the rendition/preview-image
// endpoints specifically, separate from the general lr_partner_apis scope.
export const ADOBE_SCOPE = 'openid,AdobeID,lr_partner_apis,lr_partner_rendition_apis,offline_access';

export interface AdobeTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
  token_type: string;
}

export interface StoredSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
}

export function buildAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const url = new URL(ADOBE_AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', ADOBE_SCOPE);
  url.searchParams.set('state', state);
  return url.toString();
}

async function postForm(body: URLSearchParams): Promise<AdobeTokenResponse> {
  const res = await fetch(ADOBE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`Adobe token endpoint returned ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<AdobeTokenResponse>;
}

export function exchangeCodeForTokens(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<AdobeTokenResponse> {
  return postForm(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      code: params.code,
    }),
  );
}

export function refreshAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<AdobeTokenResponse> {
  return postForm(
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
    }),
  );
}
