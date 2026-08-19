// Base host for the actual Lightroom content API — separate from the IMS
// auth host (ims-na1.adobelogin.com) used only for login/token exchange.
// Verified against Adobe's own official sample code
// (AdobeDocs/lightroom-partner-apis/samples/src/common/lr/*.mjs), since
// this isn't spelled out clearly in the prose documentation.
const LIGHTROOM_API_HOST = 'https://lr.adobe.io';

// Adobe prefixes JSON responses with this (classic JSON-hijacking
// mitigation) — has to be stripped before JSON.parse, confirmed in
// Adobe's own LrRequestor.mjs sample.
const WHILE_1_PREFIX = /^while\s*\(\s*1\s*\)\s*\{\s*\}\s*/;

interface LightroomFetchOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
}

function lightroomFetch(accessToken: string, apiKey: string, path: string, options: LightroomFetchOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'X-API-Key': apiKey,
    Authorization: `Bearer ${accessToken}`,
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(`${LIGHTROOM_API_HOST}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

export async function lightroomJson<T>(
  accessToken: string,
  apiKey: string,
  path: string,
  options: LightroomFetchOptions = {},
): Promise<T> {
  const res = await lightroomFetch(accessToken, apiKey, path, options);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Lightroom API ${path} returned ${res.status}: ${text.slice(0, 500)}`);
  }
  const cleaned = text.replace(WHILE_1_PREFIX, '');
  return (cleaned.length ? JSON.parse(cleaned) : undefined) as T;
}

/** For binary responses (renditions) — returns the raw upstream Response so callers can stream the body straight through without buffering the whole image in memory. */
export function lightroomBinary(accessToken: string, apiKey: string, path: string): Promise<Response> {
  return lightroomFetch(accessToken, apiKey, path);
}

export async function getCatalogId(accessToken: string, apiKey: string): Promise<string> {
  const catalog = await lightroomJson<{ id: string }>(accessToken, apiKey, '/v2/catalog');
  return catalog.id;
}
