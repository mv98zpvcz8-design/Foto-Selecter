import { useEffect, useRef, useState } from 'react';
import type { PhotoResult } from '../../types';
import { halftoneDataUrl, type HalftoneStyle } from './halftone';

interface HalftoneImageProps {
  photo: PhotoResult;
  widthPx: number;
  heightPx: number;
  zoom?: number;
  style?: Partial<HalftoneStyle>;
}

const DEFAULT_STYLE: HalftoneStyle = { cell: 7, angleDeg: 24, inkColor: '#171310', paperColor: '#ecdfc4' };

/**
 * Async canvas processing means there's a frame (or several, at export
 * resolution) with no halftone yet -- fall back to a plain grayscale crop
 * for that gap instead of a blank box, using the same subject-center focus
 * point so the fallback and the halftone don't visibly jump when it swaps in.
 */
export function HalftoneImage({ photo, widthPx, heightPx, zoom = 1.6, style }: HalftoneImageProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const requestRef = useRef(0);
  const resolvedStyle: HalftoneStyle = {
    cell: style?.cell ?? DEFAULT_STYLE.cell,
    angleDeg: style?.angleDeg ?? DEFAULT_STYLE.angleDeg,
    inkColor: style?.inkColor ?? DEFAULT_STYLE.inkColor,
    paperColor: style?.paperColor ?? DEFAULT_STYLE.paperColor,
  };
  const center = photo.subjectCenter;
  const focusX = center ? Math.max(0, Math.min(1, center.x)) : 0.5;
  const focusY = center ? Math.max(0, Math.min(1, center.y)) : 0.4;

  const previewUrl = photo.previewUrl;

  useEffect(() => {
    if (!previewUrl) return;
    const requestId = ++requestRef.current;
    setDataUrl(null);
    halftoneDataUrl(previewUrl, Math.round(widthPx), Math.round(heightPx), focusX, focusY, zoom, resolvedStyle)
      .then((url) => {
        if (requestRef.current === requestId) setDataUrl(url);
      })
      .catch(() => {
        // Leave dataUrl null -- the grayscale fallback below stays visible.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, widthPx, heightPx, focusX, focusY, zoom, resolvedStyle.cell, resolvedStyle.angleDeg, resolvedStyle.inkColor, resolvedStyle.paperColor]);

  return (
    <>
      <img
        src={photo.previewUrl}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: `${focusX * 100}% ${focusY * 100}%`,
          filter: 'grayscale(1) contrast(1.15)',
          opacity: dataUrl ? 0 : 1,
        }}
      />
      {dataUrl && (
        <img
          src={dataUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
        />
      )}
    </>
  );
}
