/**
 * Real dot-screen halftone: sample local luminance per grid cell and draw an
 * ink circle whose radius scales with darkness. This is the actual
 * newspaper/print halftone algorithm (per-pixel luminance -> dot size) --
 * `halftoneOverlayStyle` in posterTexture.ts is a fixed-dot-pitch CSS
 * texture layered over a photo, which reads as a flat pattern rather than a
 * genuine print reproduction of that specific photo. This produces the real
 * thing, at the cost of being computed (not just a CSS background).
 */
export interface HalftoneStyle {
  /** Grid spacing between dot centers, in output pixels. */
  cell: number;
  angleDeg: number;
  inkColor: string;
  paperColor: string;
}

/**
 * Renders `imageUrl` into an `outWidth`x`outHeight` halftone, cover-fit and
 * zoomed toward (focusX, focusY) (each 0-1, same convention as CSS
 * object-position) the way `smartObjectPosition` already expresses a
 * photo's subject center elsewhere in the poster templates. `zoom` >= 1
 * lets a template push in tighter than a plain cover-fit -- halftone dots
 * only read as a deliberate "gritty portrait" at a fairly tight crop; on a
 * wide scene they just look like uniform noise.
 */
export async function halftoneDataUrl(
  imageUrl: string,
  outWidth: number,
  outHeight: number,
  focusX: number,
  focusY: number,
  zoom: number,
  { cell, angleDeg, inkColor, paperColor }: HalftoneStyle,
): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('halftone: image failed to load'));
    img.src = imageUrl;
  });

  const src = document.createElement('canvas');
  src.width = outWidth;
  src.height = outHeight;
  const sctx = src.getContext('2d');
  if (!sctx) throw new Error('halftone: 2d context unavailable');

  const baseScale = Math.max(outWidth / img.width, outHeight / img.height) * Math.max(1, zoom);
  const dw = img.width * baseScale;
  const dh = img.height * baseScale;
  // Clamped so the drawn image always fully covers the canvas regardless of
  // focus point -- an uncovered strip reads as pure black once halftoned
  // (zero luminance), not as a visible cropping bug, so this has to be
  // airtight rather than just "usually fine".
  const dx = Math.min(0, Math.max(outWidth / 2 - dw * focusX, outWidth - dw));
  const dy = Math.min(0, Math.max(outHeight / 2 - dh * focusY, outHeight - dh));
  sctx.drawImage(img, dx, dy, dw, dh);
  const srcData = sctx.getImageData(0, 0, outWidth, outHeight).data;

  const out = document.createElement('canvas');
  out.width = outWidth;
  out.height = outHeight;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('halftone: 2d context unavailable');
  ctx.fillStyle = paperColor;
  ctx.fillRect(0, 0, outWidth, outHeight);
  ctx.fillStyle = inkColor;

  const angle = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const diag = Math.sqrt(outWidth * outWidth + outHeight * outHeight);
  const maxR = cell * 0.62;

  for (let v = -diag; v < diag; v += cell) {
    for (let u = -diag; u < diag; u += cell) {
      const x = Math.round(u * cos - v * sin + outWidth / 2);
      const y = Math.round(u * sin + v * cos + outHeight / 2);
      if (x < 0 || x >= outWidth || y < 0 || y >= outHeight) continue;
      const i = (y * outWidth + x) * 4;
      const lum = (0.299 * srcData[i] + 0.587 * srcData[i + 1] + 0.114 * srcData[i + 2]) / 255;
      const r = (1 - lum) * maxR;
      if (r < 0.6) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return out.toDataURL('image/png');
}
