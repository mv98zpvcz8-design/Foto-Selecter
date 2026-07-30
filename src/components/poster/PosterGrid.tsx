import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';

/** A clean photo grid (up to 6 images) with a slim title strip — the "contact sheet as poster" look. Structurally distinct from every other template: no single hero image dominates. */
export function PosterGrid({ data, widthPx, heightPx }: PosterTemplateProps) {
  const s = scaleOf(widthPx);
  const photos = data.galleryPhotos.slice(0, 6);
  const columns = photos.length <= 4 ? 2 : 3;
  const gap = 8 * s;

  return (
    <div
      style={{
        width: widthPx,
        height: heightPx,
        background: data.palette.background,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: gap * 2,
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
          <div key={photo.id} style={{ overflow: 'hidden', background: '#00000015' }}>
            <img
              src={photo.previewUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: smartObjectPosition(photo), display: 'block' }}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingTop: gap * 2.5,
        }}
      >
        <div style={{ fontSize: 22 * s, fontWeight: 700, letterSpacing: 1 * s, color: data.palette.text }}>
          {data.titleText}
        </div>
        {data.dateText && (
          <div style={{ fontSize: 13 * s, color: data.palette.textMuted }}>{data.dateText}</div>
        )}
      </div>
    </div>
  );
}
