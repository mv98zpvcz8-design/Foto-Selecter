export const config = { runtime: 'edge' };

import { getActiveSession } from '../_lib/lightroomSession.js';
import { getCatalogId, lightroomJson } from '../_lib/lightroomApi.js';
import { requiredEnv } from '../_lib/env.js';

interface AlbumPicksRequest {
  assetIds: unknown;
  albumName: unknown;
}

interface LrCreatedAlbum {
  id: string;
}

const ADD_CONCURRENCY = 4;

/**
 * Creates a new Lightroom album and adds the given assets to it — the
 * "send picks back to Lightroom" counterpart to the read-only import flow.
 * A new album rather than star ratings on purpose: non-destructive (never
 * touches whatever rating system the photographer already has going) and
 * trivially undoable (delete the album). Endpoint shapes are assembled
 * from the same Adobe Partner API conventions the existing (tested) read
 * endpoints in this file follow, but these specific write calls haven't
 * been exercised against a live account yet — same honesty as the first
 * pass of the Canva integration.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const active = await getActiveSession(req);
  if (!active) return jsonResponse({ error: 'not_connected' }, 401);

  let body: AlbumPicksRequest;
  try {
    body = (await req.json()) as AlbumPicksRequest;
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400);
  }

  const assetIds = Array.isArray(body.assetIds)
    ? body.assetIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const albumName =
    typeof body.albumName === 'string' && body.albumName.trim().length > 0 ? body.albumName.trim() : 'Foto-Selecter Picks';
  if (assetIds.length === 0) return jsonResponse({ error: 'no_assets' }, 400);

  try {
    const apiKey = requiredEnv('ADOBE_CLIENT_ID');
    const accessToken = active.session.accessToken;
    const catalogId = await getCatalogId(accessToken, apiKey);

    const created = await lightroomJson<LrCreatedAlbum>(
      accessToken,
      apiKey,
      `/v2/catalogs/${catalogId}/albums`,
      { method: 'POST', body: { subtype: 'collection', payload: { name: albumName } } },
    );
    const albumId = created.id;

    let added = 0;
    let failed = 0;
    let cursor = 0;
    async function worker() {
      while (cursor < assetIds.length) {
        const assetId = assetIds[cursor];
        cursor += 1;
        try {
          await lightroomJson(
            accessToken,
            apiKey,
            `/v2/catalogs/${catalogId}/albums/${albumId}/assets/${assetId}`,
            { method: 'PUT', body: {} },
          );
          added += 1;
        } catch (err) {
          console.error(`Lightroom add-asset-to-album failed for ${assetId}:`, err);
          failed += 1;
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(ADD_CONCURRENCY, assetIds.length) }, worker));

    return jsonResponse({ albumId, albumName, added, failed }, 200, active.refreshedCookie);
  } catch (err) {
    console.error('Lightroom album-picks failed:', err);
    return jsonResponse({ error: 'lightroom_request_failed' }, 502);
  }
}

function jsonResponse(body: unknown, status = 200, setCookie?: string): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (setCookie) headers.append('Set-Cookie', setCookie);
  return new Response(JSON.stringify(body), { status, headers });
}
