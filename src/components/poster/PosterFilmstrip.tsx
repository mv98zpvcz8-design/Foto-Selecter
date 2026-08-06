import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';
import { SprocketEdge } from './SprocketEdge';
import { ResizedImage } from './ResizedImage';

/**
 * A vertical stack of photos actually built like a strip of film: real
 * perforated edges on both outer sides (see SprocketEdge) and each frame
 * numbered the way a lab prints frame numbers on the film base — the name
 * was a metaphor before, now the object itself looks like what it's named
 * after. Only generated when there are
 * enough distinct good photos to justify a sequence (see minPhotos in
 * posterTemplates.ts). Structurally distinct from the grid template (a
 * single strip, not a grid) and from every hero-image template (no single
 * dominant photo).
 */
export function PosterFilmstrip({ data, widthPx, heightPx }: PosterTemplateProps) {
  const s = scaleOf(widthPx);
  const photos = data.galleryPhotos.slice(0, 5);
  const gap = 10 * s;
  const railWidth = 84 * s;
  const sprocketWidth = 40 * s;

  return (
    <div
      style={{
        position: 'relative',
        width: widthPx,
        height: heightPx,
        background: '#141210',
        display: 'flex',
        boxSizing: 'border-box',
        padding: `${gap * 3}px ${sprocketWidth + gap * 2}px`,
        fontFamily: '"Courier New", ui-monospace, monospace',
      }}
    >
      <SprocketEdge side="left" width={sprocketWidth} color="#2a251f" />
      <SprocketEdge side="right" width={sprocketWidth} color="#2a251f" />

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
            fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
            fontSize: 26 * s,
            fontWeight: 700,
            letterSpacing: 4 * s,
            color: '#f0ece2',
            textTransform: 'uppercase',
          }}
        >
          {data.titleText}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap, minWidth: 0 }}>
        {photos.map((photo, i) => (
          <div key={photo.id} style={{ flex: 1, minHeight: 0, display: 'flex', gap: 6 * s, alignItems: 'stretch' }}>
            <div
              style={{
                writingMode: 'vertical-rl',
                fontSize: 12 * s,
                letterSpacing: 1 * s,
                color: '#8a8272',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              {String(24 + i).padStart(2, '0')}A
            </div>
            <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <ResizedImage
                photo={photo}
                maxDim={Math.round(widthPx * 0.9)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: smartObjectPosition(photo),
                  display: 'block',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
