// Maps this app's already-derived poster data (hero photo + title/date +
// palette — see src/lib/posterData.ts on the client) into a Photoshop API
// createDocument/documentOperations request body. Kept separate from the
// client's PosterData type (api/ and src/ are independent TS projects, see
// tsconfig.api.json) — only the plain values actually needed cross the
// boundary, via the request JSON.
//
// v1 scope: one layout only (mirrors PosterMinimalist.tsx — hero photo
// centered with margin, title + date below), reusing the app's existing
// layout proportions rather than inventing new ones. The exact Photoshop
// API layer schema below is assembled from Adobe's public OpenAPI spec and
// SDK examples, not from a live-tested call — some field names may need
// adjusting once real credentials are available to test against.

export interface PhotoshopPosterRequest {
  heroImageUrl: string; // must be an https URL the Photoshop API can fetch (see blob-upload.ts)
  titleText: string;
  dateText: string | null;
  backgroundHex: string;
  textHex: string;
}

// A3 portrait @ 150dpi — deliberately lower than the client generator's
// 300dpi export for v1, since every extra pixel is more upload/render/
// download time on a synchronous-feeling "generate my poster" action;
// worth raising once the pipeline is proven to work end-to-end.
const CANVAS_WIDTH = 2481;
const CANVAS_HEIGHT = Math.round(CANVAS_WIDTH * Math.SQRT2);

function hexToRgbObject(hex: string): { red: number; green: number; blue: number } {
  const clean = hex.replace('#', '');
  return {
    red: parseInt(clean.slice(0, 2), 16),
    green: parseInt(clean.slice(2, 4), 16),
    blue: parseInt(clean.slice(4, 6), 16),
  };
}

export function buildMinimalistManifest(input: PhotoshopPosterRequest) {
  const margin = Math.round(CANVAS_WIDTH * 0.08);
  const photoTop = margin;
  const photoBottom = Math.round(CANVAS_HEIGHT * 0.76);
  const photoWidth = CANVAS_WIDTH - margin * 2;
  const photoHeight = photoBottom - photoTop;
  const titleTop = photoBottom + Math.round(CANVAS_HEIGHT * 0.025);
  const dateTop = titleTop + Math.round(CANVAS_HEIGHT * 0.045);

  const layers: unknown[] = [
    {
      type: 'smartObject',
      name: 'hero-photo',
      input: { href: input.heroImageUrl, storage: 'external' },
      bounds: { top: photoTop, left: margin, width: photoWidth, height: photoHeight },
    },
    {
      type: 'textLayer',
      name: 'title',
      text: {
        content: input.titleText.toUpperCase(),
        size: Math.round(CANVAS_WIDTH * 0.03),
        color: hexToRgbObject(input.textHex),
        tracking: 200,
      },
      bounds: { top: titleTop, left: margin, width: photoWidth, height: Math.round(CANVAS_HEIGHT * 0.04) },
    },
  ];

  if (input.dateText) {
    layers.push({
      type: 'textLayer',
      name: 'date',
      text: {
        content: input.dateText,
        size: Math.round(CANVAS_WIDTH * 0.014),
        color: hexToRgbObject(input.textHex),
        tracking: 100,
      },
      bounds: { top: dateTop, left: margin, width: photoWidth, height: Math.round(CANVAS_HEIGHT * 0.025) },
    });
  }

  return {
    document: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      resolution: 150,
      fill: hexToRgbObject(input.backgroundHex),
      mode: 'rgb',
      depth: 8,
    },
    layers,
  };
}
