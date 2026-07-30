import type { PosterTemplateProps } from './posterTemplates';
import type { PhotoResult } from '../../types';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';
import { grainOverlayStyle } from './posterTexture';
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
  { left: 6, top: 12, width: 58, rotateDeg: -3, z: 2 },
  { left: 46, top: 4, width: 44, rotateDeg: 5, z: 3 },
  { left: 10, top: 54, width: 40, rotateDeg: 4, z: 4 },
  { left: 50, top: 58, width: 42, rotateDeg: -5, z: 1 },
];

// A strip of "washi tape" pinning down a couple of the photos, positioned
// relative to the whole poster (not the tile itself) so it convincingly
// straddles two edges the way real tape does.
const TAPE_SPOTS = [
  { left: 16, top: 9, rotateDeg: -18 },
  { left: 60, top: 1.5, rotateDeg: 12 },
];

function WashiTape({ left, top, rotateDeg, color, s }: { left: number; top: number; rotateDeg: number; color: string; s: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: `${top}%`,
        width: 76 * s,
        height: 26 * s,
        transform: `rotate(${rotateDeg}deg)`,
        background: color,
        opacity: 0.55,
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.3) 0 4px, transparent 4px 9px)',
        boxShadow: `0 ${2 * s}px ${5 * s}px rgba(0,0,0,0.18)`,
        zIndex: 10,
      }}
    />
  );
}

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
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', clipPath: TORN_EDGE_CLIP }}>
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
        <div style={grainOverlayStyle(0.12)} />
      </div>
    </div>
  );
}

/** Overlapping "torn snapshot" cutouts on a textured paper background, pinned with washi tape, with a double-ring stamp badge and layered display type — inspired by the torn-paper/scrapbook travel-poster references. Deliberately imperfect/overlapping rather than gridded, for a handmade-collage feel distinct from every other template here. */
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
      <div style={grainOverlayStyle(0.05, 'multiply')} />

      {photos.map((photo, i) => (
        <PhotoCutout key={photo.id} photo={photo} placement={PLACEMENTS[i]} s={s} />
      ))}

      {TAPE_SPOTS.map((spot, i) => (
        <WashiTape key={i} {...spot} color={i === 0 ? data.palette.accent : data.palette.photoAverage} s={s} />
      ))}

      {/* Double-ring stamp badge, standing in for the circular/stamp graphic elements in the references */}
      <div
        style={{
          position: 'absolute',
          right: 10 * s,
          top: 10 * s,
          width: 100 * s,
          height: 100 * s,
          borderRadius: '50%',
          border: `${2 * s}px solid ${data.palette.accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          transform: 'rotate(10deg)',
          color: data.palette.accent,
          zIndex: 6,
          background: 'rgba(255,251,244,0.7)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 8 * s,
            borderRadius: '50%',
            border: `${1 * s}px solid ${data.palette.accent}`,
            opacity: 0.6,
          }}
        />
        <div style={{ fontSize: 11 * s, letterSpacing: 1 * s, textTransform: 'uppercase', padding: `0 ${6 * s}px` }}>
          {t(`poster.mood.${data.mood}`)}
        </div>
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
        <div style={{ fontSize: 17 * s, fontStyle: 'italic', color: data.palette.accent, marginBottom: 2 * s }}>
          {t(`poster.people.${data.peopleFormat}`)}
        </div>
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
