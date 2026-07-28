export const config = { runtime: 'edge' };

import { getActiveSession } from '../_lib/lightroomSession';
import { getCatalogId, lightroomJson } from '../_lib/lightroomApi';
import { requiredEnv } from '../_lib/env';

interface LrAlbumResource {
  id: string;
  subtype: string;
  payload?: { name?: string };
}

export interface LightroomAlbumSummary {
  id: string;
  name: string;
}

/** Lists the user's regular albums (not folders/"collection sets" — just the flat, actually-browsable albums, which is enough for picking one to import from). */
export default async function handler(req: Request): Promise<Response> {
  const active = await getActiveSession(req);
  if (!active) return jsonResponse({ error: 'not_connected' }, 401);

  try {
    const apiKey = requiredEnv('ADOBE_CLIENT_ID');
    const catalogId = await getCatalogId(active.session.accessToken, apiKey);
    const data = await lightroomJson<{ resources: LrAlbumResource[] }>(
      active.session.accessToken,
      apiKey,
      `/v2/catalogs/${catalogId}/albums?subtype=collection`,
    );

    const albums: LightroomAlbumSummary[] = (data.resources ?? [])
      .filter((a) => a.subtype === 'collection')
      .map((a) => ({ id: a.id, name: a.payload?.name ?? '(ohne Namen)' }));

    return jsonResponse({ albums }, 200, active.refreshedCookie);
  } catch (err) {
    console.error('Lightroom albums fetch failed:', err);
    return jsonResponse({ error: 'lightroom_request_failed' }, 502);
  }
}

function jsonResponse(body: unknown, status = 200, setCookie?: string): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (setCookie) headers.append('Set-Cookie', setCookie);
  return new Response(JSON.stringify(body), { status, headers });
}
