import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';

// Fixed asymmetric layout (irregular tile sizes, not a uniform grid) —
// inspired by the puzzle-piece photo-grid poster references. One photo
// dominates (top-left, 2x2), the rest fill progressively smaller cells.
const AREAS = `
  "a a b"
  "a a c"
  "d e c"
`;

/** Irregular photo-grid collage: tile sizes vary instead of a uniform contact-sheet grid, with a bold title band cutting across the middle. Needs at least 5 photos so the size variation actually reads as intentional rather than an accident of a near-empty grid. */
export function PosterCollage({ data, widthPx, heightPx }: PosterTemplateProps) {
  const s = scaleOf(widthPx);
  const photos = data.galleryPhotos.slice(0, 5);
  const gap = 6 * s;
  const letters = ['a', 'b', 'c', 'd', 'e'];

  return (
    <div
      style={{
        position: 'relative',
        width: widthPx,
        height: heightPx,
        background: '#111',
        boxSizing: 'border-box',
        padding: gap * 2,
        fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: AREAS,
          gap,
        }}
      >
        {photos.map((photo, i) => (
          <div key={photo.id} style={{ gridArea: letters[i], overflow: 'hidden', position: 'relative' }}>
            <img
              src={photo.previewUrl}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: smartObjectPosition(photo),
                display: 'block',
                filter: 'saturate(1.05)',
              }}
            />
          </div>
        ))}
      </div>

      {/* Title band cuts across the collage rather than sitting in a separate zone — the grid photos read as a backdrop for it */}
      <div
        style={{
          position: 'absolute',
          left: '8%',
          right: '8%',
          top: '50%',
          transform: 'translateY(-50%)',
          background: data.palette.accent,
          padding: `${16 * s}px ${28 * s}px`,
          boxShadow: `0 ${6 * s}px ${28 * s}px rgba(0,0,0,0.35)`,
        }}
      >
        <div
          style={{
            fontSize: 46 * s,
            fontWeight: 800,
            letterSpacing: -0.5 * s,
            textTransform: 'uppercase',
            color: data.palette.accentText,
            lineHeight: 1,
          }}
        >
          {data.titleText}
        </div>
        {data.dateText && (
          <div style={{ marginTop: 6 * s, fontSize: 15 * s, color: data.palette.accentText, opacity: 0.75, letterSpacing: 1 * s }}>
            {data.dateText}
          </div>
        )}
      </div>
    </div>
  );
}
