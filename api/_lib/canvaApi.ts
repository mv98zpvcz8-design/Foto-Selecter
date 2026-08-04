// Canva Connect API calls needed for the "create a poster design from this
// photo" flow. Endpoint paths and field names are assembled from Canva's
// public OpenAPI spec (canva-sdks/canva-connect-api-starter-kit), not from
// a live-tested call — some field names may need adjusting once real
// credentials let us actually test against them.
const CANVA_API_HOST = 'https://api.canva.com';

interface AssetUploadJob {
  id: string;
  status: 'in_progress' | 'success' | 'failed';
  asset?: { id: string };
  error?: { message?: string };
}

/** Starts an async asset-upload job for the given image and polls until it resolves to an assetId. */
export async function uploadAssetAndWait(accessToken: string, image: Blob, fileName: string): Promise<string> {
  const metadata = JSON.stringify({ name_base64: btoa(unescape(encodeURIComponent(fileName))) });

  const startRes = await fetch(`${CANVA_API_HOST}/rest/v1/asset-uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Asset-Upload-Metadata': metadata,
    },
    body: image,
  });
  if (!startRes.ok) {
    throw new Error(`Canva asset-uploads returned ${startRes.status}: ${await startRes.text()}`);
  }
  let job = ((await startRes.json()) as { job: AssetUploadJob }).job;

  const maxAttempts = 15;
  for (let attempt = 0; job.status === 'in_progress' && attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pollRes = await fetch(`${CANVA_API_HOST}/rest/v1/asset-uploads/${job.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!pollRes.ok) {
      throw new Error(`Canva asset-uploads poll returned ${pollRes.status}: ${await pollRes.text()}`);
    }
    job = ((await pollRes.json()) as { job: AssetUploadJob }).job;
  }

  if (job.status !== 'success' || !job.asset) {
    throw new Error(`Canva asset upload did not succeed: ${job.error?.message ?? job.status}`);
  }
  return job.asset.id;
}

interface CanvaDesign {
  id: string;
  urls?: { edit_url?: string; view_url?: string };
}

/** Creates a new design pre-loaded with the uploaded asset and returns the URL to send the user to for editing. */
export async function createDesignFromAsset(accessToken: string, assetId: string): Promise<string> {
  const res = await fetch(`${CANVA_API_HOST}/rest/v1/designs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_type: { type: 'preset', name: 'poster' },
      asset_id: assetId,
    }),
  });
  if (!res.ok) {
    throw new Error(`Canva designs endpoint returned ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { design: CanvaDesign };
  const editUrl = data.design.urls?.edit_url;
  if (!editUrl) {
    throw new Error(`Canva design response had no edit_url: ${JSON.stringify(data)}`);
  }
  return editUrl;
}
