import { photoshopAuthHeaders } from './photoshopAuth.js';

// Per Adobe's Photoshop API (Firefly Services) — same image.adobe.io host
// used across their image/document editing APIs. Unverified against a live
// call yet; the exact response shape (status field names, output href
// location) may need adjusting once real credentials let us actually test.
const PHOTOSHOP_API_HOST = 'https://image.adobe.io';

export interface PhotoshopJobHandle {
  statusUrl: string;
}

/** Starts an async document-creation job; Photoshop API calls are job-based (submit, then poll), not synchronous. */
export async function submitCreateDocumentJob(manifest: unknown): Promise<PhotoshopJobHandle> {
  const headers = await photoshopAuthHeaders();
  const res = await fetch(`${PHOTOSHOP_API_HOST}/pie/psdService/documentCreate`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(manifest),
  });
  if (!res.ok) {
    throw new Error(`Photoshop API documentCreate returned ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { _links?: { self?: { href?: string } }; statusUrl?: string };
  const statusUrl = data._links?.self?.href ?? data.statusUrl;
  if (!statusUrl) {
    throw new Error(`Photoshop API documentCreate response had no status URL to poll: ${JSON.stringify(data)}`);
  }
  return { statusUrl };
}

export interface PhotoshopJobStatus {
  done: boolean;
  succeeded: boolean;
  outputUrl?: string;
  raw: unknown;
}

interface PhotoshopJobOutput {
  status?: string;
  output?: { href?: string };
  href?: string;
}

/** Polls a job's status URL; the caller decides how often (see status.ts — one poll per client request, not a server-side loop, to stay inside an Edge Function's own request timeout). */
export async function checkJobStatus(handle: PhotoshopJobHandle): Promise<PhotoshopJobStatus> {
  const headers = await photoshopAuthHeaders();
  const res = await fetch(handle.statusUrl, { headers });
  if (!res.ok) {
    throw new Error(`Photoshop API status check returned ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { outputs?: PhotoshopJobOutput[]; status?: string };
  const first = data.outputs?.[0];
  const status = first?.status ?? data.status;
  const done = status === 'succeeded' || status === 'failed';
  return {
    done,
    succeeded: status === 'succeeded',
    outputUrl: first?.output?.href ?? first?.href,
    raw: data,
  };
}
