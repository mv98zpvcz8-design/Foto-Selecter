export const config = { runtime: 'edge' };

import { getActiveSession } from '../_lib/lightroomSession';
import { getCatalogId, lightroomBinary } from '../_lib/lightroomApi';
import { requiredEnv } from '../_lib/env';

// thumbnail2x: fast small preview for the album-browsing grid.
// 2048: what actually gets analyzed — plenty for our 480px internal
// downscale, far cheaper to fetch than the full original for a
// hundreds-of-photos album.
const ALLOWED_TYPES = new Set(['thumbnail2x', '640', '1280', '2048', 'fullsize']);

/** Streams a rendition image straight through from Lightroom to the browser — never buffered into a file, never written to disk on our side either (Edge functions have no persistent disk). */
export default async function handler(req: Request): Promise<Response> {
  const active = await getActiveSession(req);
  if (!active) return new Response(null, { status: 401 });

  const url = new URL(req.url);
  const assetId = url.searchParams.get('assetId');
  const type = url.searchParams.get('type') ?? '2048';
  if (!assetId || !ALLOWED_TYPES.has(type)) {
    return new Response(null, { status: 400 });
  }

  try {
    const apiKey = requiredEnv('ADOBE_CLIENT_ID');
    const catalogId = await getCatalogId(active.session.accessToken, apiKey);
    const upstream = await lightroomBinary(
      active.session.accessToken,
      apiKey,
      `/v2/catalogs/${catalogId}/assets/${assetId}/renditions/${type}`,
    );
    if (!upstream.ok || !upstream.body) {
      return new Response(null, { status: upstream.status });
    }

    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'image/jpeg');
    headers.set('Cache-Control', 'private, max-age=3600');
    if (active.refreshedCookie) headers.append('Set-Cookie', active.refreshedCookie);
    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    console.error('Lightroom rendition fetch failed:', err);
    return new Response(null, { status: 502 });
  }
}
