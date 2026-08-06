import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';
import { SprocketEdge } from './SprocketEdge';
import { ResizedImage } from './ResizedImage';
import { useT } from '../../i18n/useT';

/**
 * A photographer's proof sheet: dense grid of frames, sprocket-hole edges,
 * each frame numbered, and a grease-pencil circle around the hero frame —
 * a real contact-sheet editing convention (marking the selected pick), so
 * it's information rather than decoration. Niche on purpose: a portfolio
 * or behind-the-scenes piece, not a general-purpose poster. Needs enough
 * real frames to read as an actual sheet (see minPhotos in posterTemplates.ts).
 */
export function PosterContactSheet({ data, widthPx, heightPx }: PosterTemplateProps) {
  const t = useT();
  const s = scaleOf(widthPx);
  const photos = data.galleryPhotos.slice(0, 12);
  const columns = photos.length > 9 ? 4 : 3;
  const rows = Math.ceil(photos.length / columns);
  const sprocketWidth = 44 * s;
  const gap = 10 * s;

  return (
    <div
      style={{
        position: 'relative',
        width: widthPx,
        height: heightPx,
        background: '#efece4',
        boxSizing: 'border-box',
        padding: `${64 * s}px ${sprocketWidth + 28 * s}px`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Courier New", ui-monospace, monospace',
      }}
    >
      <SprocketEdge side="left" width={sprocketWidth} />
      <SprocketEdge side="right" width={sprocketWidth} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 * s }}>
        <div style={{ fontSize: 15 * s, letterSpacing: 4 * s, textTransform: 'uppercase', fontWeight: 700, color: '#1c1a15' }}>
          {t('poster.template.contactSheet')} &middot; {data.titleText}
        </div>
        {data.dateText && <div style={{ fontSize: 12 * s, color: '#71695a' }}>{data.dateText}</div>}
      </div>

      {/* Rows sized as equal flex fractions of whatever height is actually
          available -- a fixed aspect-ratio per tile leaves a large empty
          gap under a partial sheet (6 frames doesn't fill a 12-frame grid's
          worth of vertical space) instead of filling the page like a real
          contact sheet always does. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap,
        }}
      >
        {photos.map((photo, i) => (
          <div key={photo.id} style={{ position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', background: '#00000010' }}>
              <ResizedImage
                photo={photo}
                maxDim={Math.round((widthPx / columns) * 1.6)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: smartObjectPosition(photo),
                  display: 'block',
                  filter: 'grayscale(0.85) contrast(1.08)',
                }}
              />
              {i === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: `${-10 * s}px`,
                    border: `${3 * s}px solid #c0392b`,
                    borderRadius: '52% 48% 55% 45% / 48% 55% 45% 52%',
                    opacity: 0.85,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
            <div style={{ marginTop: 4 * s, fontSize: 11 * s, letterSpacing: 1 * s, color: '#8a8272', flexShrink: 0 }}>
              {String(i + 1).padStart(2, '0')}
              {i === 0 && <span style={{ color: '#c0392b', marginLeft: 8 * s }}>{t('poster.contactSheet.pick')}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
