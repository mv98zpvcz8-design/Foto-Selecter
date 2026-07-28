export const config = { runtime: 'edge' };

import { getActiveSession } from '../../../_lib/lightroomSession.js';
import { getCatalogId, lightroomJson } from '../../../_lib/lightroomApi.js';
import { requiredEnv } from '../../../_lib/env.js';

interface LrAlbumAssetResource {
  asset?: {
    id: string;
    payload?: {
      captureDate?: string;
      importSource?: { fileName?: string; originalWidth?: number; originalHeight?: number };
    };
  };
}

interface LrPagedAssetsResponse {
  base?: string;
  resources: LrAlbumAssetResource[];
  links?: { next?: { href: string } };
}

export interface LightroomAssetSummary {
  id: string;
  fileName: string;
  captureDate: string | null;
  width: number | null;
  height: number | null;
}

const PAGE_LIMIT = 100;

/** Lists the photos in one album, paginated — `cursor` (opaque, from a previous response's nextCursor) fetches the next page instead of the first, so a 472-photo album loads incrementally rather than all at once. */
export default async function handler(req: Request): Promise<Response> {
  const active = await getActiveSession(req);
  if (!active) return jsonResponse({ error: 'not_connected' }, 401);

  const url = new URL(req.url);
  // path shape: /api/lightroom/albums/{albumId}/assets
  const segments = url.pathname.split('/').filter(Boolean);
  const albumId = segments[segments.length - 2];
  const cursor = url.searchParams.get('cursor');

  if (!albumId) return jsonResponse({ error: 'missing_album_id' }, 400);

  try {
    const apiKey = requiredEnv('ADOBE_CLIENT_ID');
    const catalogId = await getCatalogId(active.session.accessToken, apiKey);
    const path =
      cursor ??
      `/v2/catalogs/${catalogId}/albums/${albumId}/assets?subtype=image&embed=asset&limit=${PAGE_LIMIT}`;

    const data = await lightroomJson<LrPagedAssetsResponse>(active.session.accessToken, apiKey, path);

    const assets: LightroomAssetSummary[] = (data.resources ?? [])
      .filter((r) => r.asset)
      .map((r) => ({
        id: r.asset!.id,
        fileName: r.asset!.payload?.importSource?.fileName ?? r.asset!.id,
        captureDate: r.asset!.payload?.captureDate ?? null,
        width: r.asset!.payload?.importSource?.originalWidth ?? null,
        height: r.asset!.payload?.importSource?.originalHeight ?? null,
      }));

    let nextCursor: string | null = null;
    if (data.links?.next && data.base) {
      const nextUrl = new URL(`${data.base}${data.links.next.href}`);
      nextCursor = nextUrl.pathname + nextUrl.search;
    }

    return jsonResponse({ assets, nextCursor }, 200, active.refreshedCookie);
  } catch (err) {
    console.error('Lightroom album assets fetch failed:', err);
    return jsonResponse({ error: 'lightroom_request_failed' }, 502);
  }
}

function jsonResponse(body: unknown, status = 200, setCookie?: string): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (setCookie) headers.append('Set-Cookie', setCookie);
  return new Response(JSON.stringify(body), { status, headers });
}
