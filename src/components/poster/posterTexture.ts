// Grain/halftone helpers shared by the more photo-editorial poster
// templates. Pure CSS/canvas, no external assets or web fonts, so the app
// stays fully offline-capable.
import type { CSSProperties } from 'react';

let cachedGrainUrl: string | null = null;

/**
 * A small tileable grayscale noise texture, generated once on a canvas and
 * cached for the session. Flat photo overlays (a single blend-mode tint,
 * no texture) read as cheap/digital; a genuine per-pixel grain layer is
 * what makes a duotone or scrapbook treatment look like a printed poster
 * instead of a CSS filter demo.
 */
export function grainDataUrl(): string {
  if (cachedGrainUrl) return cachedGrainUrl;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  cachedGrainUrl = canvas.toDataURL('image/png');
  return cachedGrainUrl;
}

/**
 * Fixed-size (deliberately NOT scaled by the poster's own scaleOf) grain
 * overlay style — a real device-pixel-sized tile reads as fine grain at
 * both the small preview and the full print-resolution export, where a
 * scale-relative size would either vanish at preview or turn into visible
 * blotches at export.
 */
export function grainOverlayStyle(opacity: number, blendMode: CSSProperties['mixBlendMode'] = 'overlay'): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    backgroundImage: `url(${grainDataUrl()})`,
    backgroundRepeat: 'repeat',
    backgroundSize: '64px 64px',
    opacity,
    mixBlendMode: blendMode,
    pointerEvents: 'none',
  };
}

/**
 * Fine halftone dot pattern in the given color, as a CSS radial-gradient
 * background — sized in fixed device pixels for the same reason as the
 * grain tile (real print halftones are a fixed dot pitch, not something
 * that gets coarser just because the poster is rendered smaller).
 */
export function halftoneOverlayStyle(
  color: string,
  opacity: number,
  dotSizePx = 3,
  blendMode: CSSProperties['mixBlendMode'] = 'overlay',
): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    backgroundImage: `radial-gradient(circle, ${color} 1px, transparent 1.4px)`,
    backgroundSize: `${dotSizePx}px ${dotSizePx}px`,
    opacity,
    mixBlendMode: blendMode,
    pointerEvents: 'none',
  };
}
