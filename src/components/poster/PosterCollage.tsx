import type { PosterTemplateProps } from './posterTemplates';
import type { PhotoResult } from '../../types';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';
import { grainOverlayStyle } from './posterTexture';

interface TilePlacement {
  left: number;
  top: number;
  width: number;
  height: number;
  rotateDeg: number;
  z: number;
  framed: boolean;
}

// Fixed organic layout (varied sizes, overlap, alternating rotation) in
// percentages of the poster's own box — deliberately not a CSS grid, since
// a uniform grid is exactly the "generic contact sheet" look this template
// replaces. Tuned so every tile stays inside the frame at the app's fixed
// A-series aspect ratio.
const TILES: TilePlacement[] = [
  { left: 4, top: 6, width: 48, height: 40, rotateDeg: -2, z: 3, framed: true },
  { left: 48, top: 2, width: 48, height: 26, rotateDeg: 3, z: 2, framed: false },
  { left: 54, top: 30, width: 42, height: 26, rotateDeg: -3, z: 4, framed: true },
  { left: 4, top: 50, width: 38, height: 34, rotateDeg: 4, z: 2, framed: false },
  { left: 40, top: 60, width: 36, height: 24, rotateDeg: -4, z: 5, framed: true },
];

function CollageTile({ photo, placement, s }: { photo: PhotoResult; placement: TilePlacement; s: number }) {
  const pad = placement.framed ? 8 * s : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: `${placement.left}%`,
        top: `${placement.top}%`,
        width: `${placement.width}%`,
        height: `${placement.height}%`,
        transform: `rotate(${placement.rotateDeg}deg)`,
        zIndex: placement.z,
        background: '#fff',
        padding: pad,
        boxShadow: `0 ${8 * s}px ${22 * s}px rgba(0,0,0,0.32)`,
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
            filter: 'saturate(1.08) contrast(1.04)',
          }}
        />
        <div style={grainOverlayStyle(0.1)} />
      </div>
    </div>
  );
}

/** Overlapping, rotated, varied-size photo tiles over soft background color blocks — an organic puzzle-piece collage instead of a uniform contact-sheet grid, with a rotated title plate cutting across it. */
export function PosterCollage({ data, widthPx, heightPx }: PosterTemplateProps) {
  const s = scaleOf(widthPx);
  const photos = data.galleryPhotos.slice(0, 5);

  return (
    <div
      style={{
        position: 'relative',
        width: widthPx,
        height: heightPx,
        overflow: 'hidden',
        background: data.palette.background,
        fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '-12%',
          top: '-6%',
          width: '55%',
          height: '38%',
          background: data.palette.accent,
          opacity: 0.4,
          transform: 'rotate(9deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '-10%',
          bottom: '4%',
          width: '48%',
          height: '36%',
          background: data.palette.photoAverage,
          opacity: 0.35,
          transform: 'rotate(-7deg)',
        }}
      />

      {photos.map((photo, i) => (
        <CollageTile key={photo.id} photo={photo} placement={TILES[i]} s={s} />
      ))}

      <div
        style={{
          position: 'absolute',
          left: '6%',
          bottom: '5%',
          zIndex: 6,
          transform: 'rotate(-2deg)',
          background: data.palette.accent,
          padding: `${18 * s}px ${26 * s}px`,
          boxShadow: `0 ${8 * s}px ${28 * s}px rgba(0,0,0,0.4)`,
        }}
      >
        <div
          style={{
            fontSize: 13 * s,
            letterSpacing: 3 * s,
            textTransform: 'uppercase',
            color: data.palette.accentText,
            opacity: 0.8,
            fontWeight: 700,
          }}
        >
          {data.photoCountText} {data.dateText ? `· ${data.dateText}` : ''}
        </div>
        <div
          style={{
            marginTop: 4 * s,
            fontSize: 48 * s,
            fontWeight: 800,
            letterSpacing: -0.5 * s,
            textTransform: 'uppercase',
            color: data.palette.accentText,
            lineHeight: 1,
          }}
        >
          {data.titleText}
        </div>
      </div>
    </div>
  );
}
