import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

// Client-side-direct-upload token issuer. The browser PUTs the selected
// photo's bytes straight to Vercel Blob (not proxied through this
// function) using a short-lived token this endpoint hands out — the
// Photoshop API needs an https URL it can fetch the source image from, and
// this is that URL's origin, since the photo otherwise never leaves the
// browser. Blobs are uploaded with public access but a random, unguessable
// path suffix; nothing links a blob URL back to a specific user session.
export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const body = (await req.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png'],
        addRandomSuffix: true,
        // Poster source photos only need to live long enough for one
        // Photoshop API job to fetch them, not indefinitely.
        tokenPayload: JSON.stringify({ purpose: 'poster-photoshop-input' }),
      }),
      onUploadCompleted: async () => {
        // No server-side bookkeeping needed for v1 — blobs are cleaned up
        // manually/by a scheduled job later; not wired up yet.
      },
    });
    return new Response(JSON.stringify(jsonResponse), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Upload token error' }), { status: 400 });
  }
}
