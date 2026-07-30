import { buildMinimalistManifest } from '../../_lib/photoshopManifest.js';
import { submitCreateDocumentJob } from '../../_lib/photoshopApi.js';

export const config = { runtime: 'edge' };

interface SubmitBody {
  heroImageUrl?: string;
  titleText?: string;
  dateText?: string | null;
  backgroundHex?: string;
  textHex?: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = (await req.json()) as SubmitBody;
    const { heroImageUrl, titleText, dateText, backgroundHex, textHex } = body;
    if (!heroImageUrl || !titleText || !backgroundHex || !textHex) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const manifest = buildMinimalistManifest({ heroImageUrl, titleText, dateText: dateText ?? null, backgroundHex, textHex });
    const job = await submitCreateDocumentJob(manifest);
    return new Response(JSON.stringify({ statusUrl: job.statusUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 });
  }
}
