import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { DuotoneImage } from './DuotoneImage';
import { adjustSaturation, hexToRgb, mixRgb, toHex } from '../../lib/colorPalette';

/**
 * A single portrait behind a cream mat and a gold hairline frame, with a
 * drop shadow for physical print depth and a minimal line-dot-line mark
 * instead of a headline — the "museum wall print" register, deliberately
 * opposite of the bold/collage templates. Built for a portrait moment
 * (see fitsContent in posterTemplates.ts), not a crowd or an empty scene.
 */
export function PosterGalleryPrint({ data, widthPx, heightPx }: PosterTemplateProps) {
  const s = scaleOf(widthPx);

  const heroRgb = data.heroPhoto.colorStats
    ? { r: data.heroPhoto.colorStats.avgR, g: data.heroPhoto.colorStats.avgG, b: data.heroPhoto.colorStats.avgB }
    : hexToRgb(data.palette.accent);
  // A gentler mix than PosterBold's punchy sports-poster duotone -- a
  // gallery print reads as considered, not loud.
  const muted = adjustSaturation(heroRgb, 1.15);
  const shadowColor = toHex(mixRgb(muted, { r: 10, g: 8, b: 6 }, 0.72));
  const highlightColor = toHex(mixRgb(muted, { r: 246, g: 240, b: 224 }, 0.55));
  const gold = '#a9834f';

  return (
    <div
      style={{
        position: 'relative',
        width: widthPx,
        height: heightPx,
        background: '#ece3d2',
        fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 20% 10%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 55%), radial-gradient(ellipse at 85% 95%, #d9cdb6 0%, rgba(0,0,0,0) 60%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 96 * s,
          right: 96 * s,
          top: 88 * s,
          bottom: 200 * s,
          boxShadow: `0 ${34 * s}px ${70 * s}px rgba(30,22,12,0.32), 0 ${4 * s}px ${14 * s}px rgba(30,22,12,0.2)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -9 * s,
            border: `${1.5 * s}px solid ${gold}`,
            opacity: 0.55,
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: shadowColor }}>
          <DuotoneImage photo={data.heroPhoto} shadowColor={shadowColor} highlightColor={highlightColor} grain={0.1} />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 96 * s,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22 * s,
        }}
      >
        <div style={{ width: 84 * s, height: 1 * s, background: gold, opacity: 0.6 }} />
        <div style={{ width: 6 * s, height: 6 * s, borderRadius: '50%', background: gold, opacity: 0.75 }} />
        <div style={{ width: 84 * s, height: 1 * s, background: gold, opacity: 0.6 }} />
      </div>

      {(data.titleText || data.dateText) && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 52 * s, textAlign: 'center' }}>
          <div style={{ fontSize: 15 * s, letterSpacing: 5 * s, textTransform: 'uppercase', color: '#4a4030', fontWeight: 600 }}>
            {data.titleText}
          </div>
          {data.dateText && (
            <div style={{ marginTop: 6 * s, fontSize: 11 * s, letterSpacing: 2 * s, color: '#8a7d63' }}>{data.dateText}</div>
          )}
        </div>
      )}
    </div>
  );
}
