import type { PhotoResult } from '../../types';
import { smartObjectPosition } from './smartObjectPosition';

interface DuotoneImageProps {
  photo: PhotoResult;
  /** Dark end of the duotone gradient (usually the photo's own dominant hue, deepened). */
  shadowColor: string;
  /** Light end of the duotone gradient (usually the same hue, lightened). */
  highlightColor: string;
}

/**
 * Real duotone via the standard `mix-blend-mode: luminosity` recipe: a
 * diagonal shadow→highlight gradient sits underneath, and the grayscaled
 * photo on top contributes only its per-pixel luminosity — the browser
 * fills in hue/saturation from the gradient beneath. This is what actually
 * produces the "photo's own tonal detail, but mapped through two deliberate
 * colors" look (like a print duotone), unlike a flat single-color tint
 * (which just darkens/desaturates uniformly and reads as a CSS filter, not
 * a design choice).
 */
export function DuotoneImage({ photo, shadowColor, highlightColor }: DuotoneImageProps) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${shadowColor} 0%, ${highlightColor} 100%)`,
        }}
      />
      <img
        src={photo.previewUrl}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: smartObjectPosition(photo),
          filter: 'grayscale(1) contrast(1.15)',
          mixBlendMode: 'luminosity',
        }}
      />
    </>
  );
}
