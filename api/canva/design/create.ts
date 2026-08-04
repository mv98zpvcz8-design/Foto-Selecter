export const config = { runtime: 'edge' };

import { getActiveCanvaSession } from '../../_lib/canvaSession.js';
import { uploadAssetAndWait, createDesignFromAsset } from '../../_lib/canvaApi.js';

/**
 * Receives the selected photo's bytes directly in the request body (the
 * Canva Connect API calls need our OAuth bearer token, which the browser
 * never holds, so this can't be called straight from the client the way
 * the old Adobe Express embed was) — uploads it as a Canva asset, creates
 * a design from it, and returns the edit_url for the client to open.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const active = await getActiveCanvaSession(req);
  if (!active) return jsonResponse({ error: 'not_connected' }, 401);

  try {
    const image = await req.blob();
    if (image.size === 0) return jsonResponse({ error: 'empty_image' }, 400);

    const assetId = await uploadAssetAndWait(active.session.accessToken, image, `poster-photo-${Date.now()}.jpg`);
    const editUrl = await createDesignFromAsset(active.session.accessToken, assetId);

    return jsonResponse({ editUrl }, 200, active.refreshedCookie);
  } catch (err) {
    console.error('Canva design creation failed:', err);
    return jsonResponse({ error: 'canva_request_failed' }, 502);
  }
}

function jsonResponse(body: unknown, status = 200, setCookie?: string): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (setCookie) headers.append('Set-Cookie', setCookie);
  return new Response(JSON.stringify(body), { status, headers });
}
