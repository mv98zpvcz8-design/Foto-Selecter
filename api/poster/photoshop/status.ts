import { checkJobStatus } from '../../_lib/photoshopApi.js';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const statusUrl = url.searchParams.get('statusUrl');
  if (!statusUrl) {
    return new Response(JSON.stringify({ error: 'Missing statusUrl query param' }), { status: 400 });
  }

  try {
    const status = await checkJobStatus({ statusUrl });
    return new Response(JSON.stringify(status), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 });
  }
}
