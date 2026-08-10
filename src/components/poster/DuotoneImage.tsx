import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PhotoResult } from '../../types';
import { smartObjectPosition } from './smartObjectPosition';

const cache = new Map<string, string>();

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

/**
 * Bakes the duotone into real pixels via canvas instead of a live
 * `mix-blend-mode: luminosity` layer. That CSS approach rendered correctly
 * on screen but exported as a BLANK photo on iOS Safari -- html-to-image's
 * SVG-foreignObject export pipeline doesn't reliably rasterize blend modes
 * there (same lesson as the earlier SprocketEdge/halftone fixes this
 * session: anything live-CSS at export time is fragile across browsers).
 * Computing ahead of time sidesteps the export pipeline's handling of the
 * effect entirely. Trade-off: this collapses the previous diagonal-gradient
 * variant into a standard two-color luminance duotone (no positional hue
 * shift) -- a simplification, not a downgrade; it's the same technique
 * most duotone print/poster tools use.
 */
async function duotoneDataUrl(url: string, shadowColor: string, highlightColor: string, maxDim: number): Promise<string> {
  const key = `${url}:${shadowColor}:${highlightColor}:${maxDim}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('duotone: image failed to load'));
    img.src = url;
  });

  // Processing at the source photo's full native resolution (often 20+
  // megapixels) can silently exceed iOS Safari's canvas memory/area limits
  // -- getImageData/putImageData then produce nothing, with no error, which
  // is exactly what caused the exported photo to be blank on a real device.
  // Downscaling to what the template actually displays keeps this safely
  // under that ceiling regardless of source resolution.
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('duotone: 2d context unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const [sr, sg, sb] = hexToRgb(shadowColor);
  const [hr, hg, hb] = hexToRgb(highlightColor);
  // Lookup table: luminance 0-255 -> the mixed color at that point along
  // the shadow->highlight gradient, precomputed once instead of per pixel.
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    lut[i * 3] = sr + (hr - sr) * t;
    lut[i * 3 + 1] = sg + (hg - sg) * t;
    lut[i * 3 + 2] = sb + (hb - sb) * t;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    const contrasted = Math.max(0, Math.min(255, Math.round((gray - 128) * 1.15 + 128)));
    const lutIdx = contrasted * 3;
    data[i] = lut[lutIdx];
    data[i + 1] = lut[lutIdx + 1];
    data[i + 2] = lut[lutIdx + 2];
  }
  ctx.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  cache.set(key, dataUrl);
  return dataUrl;
}

interface DuotoneImageProps {
  photo: PhotoResult;
  /** Dark end of the duotone gradient (usually the photo's own dominant hue, deepened). */
  shadowColor: string;
  /** Light end of the duotone gradient (usually the same hue, lightened). */
  highlightColor: string;
  /** Longest side (in the same px units as the template's widthPx/heightPx) this image will ever actually display at -- the processing resolution, not a hard quality cap. */
  maxDim: number;
}

/** Falls back to a plain grayscale crop (no blend mode, ever) while the duotone computes, so a poster exported mid-compute is merely uncolored, never blank. */
export function DuotoneImage({ photo, shadowColor, highlightColor, maxDim }: DuotoneImageProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const requestRef = useRef(0);
  const previewUrl = photo.previewUrl;

  useEffect(() => {
    if (!previewUrl) return;
    const requestId = ++requestRef.current;
    setDataUrl(null);
    duotoneDataUrl(previewUrl, shadowColor, highlightColor, maxDim)
      .then((url) => {
        if (requestRef.current === requestId) setDataUrl(url);
      })
      .catch(() => {
        // Leave dataUrl null -- the grayscale fallback below stays visible.
      });
  }, [previewUrl, shadowColor, highlightColor, maxDim]);

  const commonStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: smartObjectPosition(photo),
  };

  if (!dataUrl) {
    return <img src={previewUrl} alt="" style={{ ...commonStyle, filter: 'grayscale(1) contrast(1.15)' }} />;
  }
  return <img src={dataUrl} alt="" style={commonStyle} />;
}
