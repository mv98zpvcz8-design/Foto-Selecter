import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';

/** A horizontal strip of 3-5 photos stacked down the frame like film frames, with the title running vertically alongside — only generated when there are enough distinct good photos to justify a sequence (see minPhotos in posterTemplates.ts). Structurally distinct from the grid template (a single strip, not a grid) and from every hero-image template (no single dominant photo). */
export function PosterFilmstrip({ data, widthPx, heightPx }: PosterTemplateProps) {
  const s = scaleOf(widthPx);
  const photos = data.galleryPhotos.slice(0, 5);
  const gap = 6 * s;
  const railWidth = 90 * s;

  return (
    <div
      style={{
        width: widthPx,
        height: heightPx,
        background: data.palette.background,
        display: 'flex',
        boxSizing: 'border-box',
        padding: gap * 3,
        fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: railWidth,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: 26 * s,
            fontWeight: 700,
            letterSpacing: 4 * s,
            color: data.palette.text,
            textTransform: 'uppercase',
          }}
        >
          {data.titleText}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap, minWidth: 0 }}>
        {photos.map((photo) => (
          <div key={photo.id} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <img
              src={photo.previewUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: smartObjectPosition(photo), display: 'block' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
