import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PhotoResult } from '../../types';

const cache = new Map<string, string>();

/**
 * A multi-tile template (contact sheet, filmstrip, grid) can end up
 * embedding a dozen full-resolution originals (some 7000px+) into a PNG
 * export even though each one displays at a few hundred pixels — the
 * export library fetches whatever `<img src>` actually points to, not
 * whatever CSS shrinks it to on screen. That's the real cost behind a
 * "download does nothing" report on those templates: it's not stuck, it's
 * just embedding megabytes of pixels nobody will see. Resizing to what the
 * layout actually needs before embedding fixes the cause, not just the
 * symptom.
 */
async function resizeToDataUrl(url: string, maxDim: number): Promise<string> {
  const key = `${url}:${maxDim}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('resize: image failed to load'));
    img.src = url;
  });

  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('resize: 2d context unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.87);
  cache.set(key, dataUrl);
  return dataUrl;
}

interface ResizedImageProps {
  photo: PhotoResult;
  /** Longest side (in the same px units as widthPx/heightPx) this tile will ever actually display at — the resize target, not a hard cap on quality. */
  maxDim: number;
  style?: CSSProperties;
}

/** Falls back to the original (uncapped) preview while the resize computes, so nothing is ever blank. */
export function ResizedImage({ photo, maxDim, style }: ResizedImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const requestRef = useRef(0);
  const previewUrl = photo.previewUrl;

  useEffect(() => {
    if (!previewUrl) return;
    const requestId = ++requestRef.current;
    resizeToDataUrl(previewUrl, maxDim)
      .then((url) => {
        if (requestRef.current === requestId) setSrc(url);
      })
      .catch(() => {
        // Leave src null -- the original previewUrl below stays in use.
      });
  }, [previewUrl, maxDim]);

  return <img src={src ?? previewUrl} alt="" style={style} />;
}
