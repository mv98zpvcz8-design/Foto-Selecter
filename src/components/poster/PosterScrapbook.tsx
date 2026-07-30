import type { PosterTemplateProps } from './posterTemplates';
import type { PhotoResult } from '../../types';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';
import { useT } from '../../i18n/useT';

// A jagged, hand-torn top edge, approximated as a fixed zig-zag clip-path —
// applied to every photo cutout so they read as torn snapshots rather than
// clean rectangles.
const TORN_EDGE_CLIP =
  'polygon(0% 4%, 6% 0%, 13% 3%, 20% 0%, 28% 4%, 36% 1%, 44% 3%, 52% 0%, 60% 4%, 68% 1%, 76% 3%, 84% 0%, 92% 3%, 100% 0%, 100% 100%, 0% 100%)';

interface Placement {
  left: number;
  top: number;
  width: number;
  rotateDeg: number;
  z: number;
}

// Fixed overlapping layout for up to 4 photos (in design-space percentages
// of the poster's own box), tuned so nothing falls outside the frame at any
// aspect ratio this app generates.
const PLACEMENTS: Placement[] = [
  { left: 6, top: 10, width: 58, rotateDeg: -3, z: 2 },
  { left: 46, top: 4, width: 44, rotateDeg: 5, z: 3 },
  { left: 10, top: 52, width: 40, rotateDeg: 4, z: 4 },
  { left: 50, top: 56, width: 42, rotateDeg: -5, z: 1 },
];

function PhotoCutout({ photo, placement, s }: { photo: PhotoResult; placement: Placement; s: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${placement.left}%`,
        top: `${placement.top}%`,
        width: `${placement.width}%`,
        aspectRatio: '4 / 5',
        transform: `rotate(${placement.rotateDeg}deg)`,
        zIndex: placement.z,
        background: '#fff',
        padding: 10 * s,
        paddingBottom: 26 * s,
        boxShadow: `0 ${10 * s}px ${26 * s}px rgba(0,0,0,0.28)`,
      }}
    >
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', clipPath: TORN_EDGE_CLIP }}>
        <img
          src={photo.previewUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: smartObjectPosition(photo),
            display: 'block',
            filter: 'saturate(0.92) contrast(1.05)',
          }}
        />
      </div>
    </div>
  );
}

/** Overlapping "torn snapshot" cutouts on a textured paper background, with a rotated stamp badge and layered display type — inspired by the torn-paper/scrapbook travel-poster references. Deliberately imperfect/overlapping rather than gridded, for a handmade-collage feel distinct from every other template here. */
export function PosterScrapbook({ data, widthPx, heightPx }: PosterTemplateProps) {
  const t = useT();
  const s = scaleOf(widthPx);
  const photos = [data.heroPhoto, ...data.galleryPhotos.filter((p) => p.id !== data.heroPhoto.id)].slice(0, 4);

  return (
    <div
      style={{
        position: 'relative',
        width: widthPx,
        height: heightPx,
        overflow: 'hidden',
        background: `radial-gradient(ellipse at 30% 20%, #fbf6ec 0%, #f1e9d8 70%)`,
        boxSizing: 'border-box',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {photos.map((photo, i) => (
        <PhotoCutout key={photo.id} photo={photo} placement={PLACEMENTS[i]} s={s} />
      ))}

      {/* Rotated stamp badge, standing in for the circular graphic elements in the collage references */}
      <div
        style={{
          position: 'absolute',
          right: 8 * s,
          top: 8 * s,
          width: 84 * s,
          height: 84 * s,
          borderRadius: '50%',
          border: `${2 * s}px solid ${data.palette.accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          transform: 'rotate(12deg)',
          color: data.palette.accent,
          fontSize: 11 * s,
          letterSpacing: 1 * s,
          textTransform: 'uppercase',
          zIndex: 5,
          background: 'rgba(255,255,255,0.6)',
        }}
      >
        {t(`poster.mood.${data.mood}`)}
      </div>

      <div
        style={{
          position: 'absolute',
          left: '6%',
          bottom: '4%',
          zIndex: 6,
          transform: 'rotate(-2deg)',
        }}
      >
        <div
          style={{
            fontSize: 58 * s,
            fontWeight: 700,
            color: '#2a2420',
            textShadow: '0 2px 0 rgba(255,255,255,0.6)',
          }}
        >
          {data.titleText}
        </div>
        {data.dateText && (
          <div style={{ marginTop: 6 * s, fontSize: 16 * s, color: '#6b6155', fontStyle: 'italic' }}>{data.dateText}</div>
        )}
      </div>
    </div>
  );
}
