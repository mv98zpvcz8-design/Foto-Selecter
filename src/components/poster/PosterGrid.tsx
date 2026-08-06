import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';
import { grainOverlayStyle } from './posterTexture';
import { useT } from '../../i18n/useT';

/**
 * A gallery wall of small framed prints — each photo gets its own white mat
 * and soft shadow rather than sitting flush in a bare grid cell, with grain
 * for print cohesion across photos that were shot in different light. The
 * "contact sheet as poster" idea, but reading as considered small prints
 * instead of thumbnails. Structurally distinct from every other template:
 * no single hero image dominates.
 */
export function PosterGrid({ data, widthPx, heightPx }: PosterTemplateProps) {
  const t = useT();
  const s = scaleOf(widthPx);
  const photos = data.galleryPhotos.slice(0, 6);
  const columns = photos.length <= 4 ? 2 : 3;
  const gap = 26 * s;
  const mat = 10 * s;

  return (
    <div
      style={{
        width: widthPx,
        height: heightPx,
        background: '#efece4',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: gap,
        fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap,
        }}
      >
        {photos.map((photo) => (
          <div
            key={photo.id}
            style={{
              background: '#fff',
              padding: mat,
              boxShadow: `0 ${6 * s}px ${18 * s}px rgba(20,18,14,0.16)`,
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
              <img
                src={photo.previewUrl}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: smartObjectPosition(photo),
                  display: 'block',
                  filter: 'saturate(1.03) contrast(1.03)',
                }}
              />
              <div style={grainOverlayStyle(0.08)} />
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingTop: gap * 0.9,
        }}
      >
        <div>
          <div style={{ fontSize: 24 * s, fontWeight: 700, letterSpacing: 1 * s, color: '#211e19' }}>
            {data.titleText}
          </div>
          <div style={{ marginTop: 4 * s, fontSize: 12 * s, letterSpacing: 2 * s, textTransform: 'uppercase', color: '#8a8272' }}>
            {t(`poster.mood.${data.mood}`)} &middot; {t(`poster.people.${data.peopleFormat}`)}
          </div>
        </div>
        {data.dateText && <div style={{ fontSize: 13 * s, color: '#8a8272' }}>{data.dateText}</div>}
      </div>
    </div>
  );
}
