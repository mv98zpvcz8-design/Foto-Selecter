import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';

/**
 * Full-bleed hero photo pushed toward high-contrast duotone (grayscale +
 * contrast, tinted with the shoot's own accent color via a blend-mode
 * overlay — not an arbitrary color), a heavy condensed headline anchored to
 * a corner scrim, and a thin accent-colored edge bar. Inspired by the
 * sports-editorial "archive remix" poster style (dramatic tight crop,
 * duotone grain, bold negative-space type) from the references, redone with
 * this app's own photo-derived palette instead of a fixed brand look.
 */
export function PosterBold({ data, widthPx, heightPx }: PosterTemplateProps) {
  const s = scaleOf(widthPx);
  const barWidth = 18 * s;

  return (
    <div
      style={{
        position: 'relative',
        width: widthPx,
        height: heightPx,
        overflow: 'hidden',
        background: '#0c0c0c',
        fontFamily: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <img
        src={data.heroPhoto.previewUrl}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: smartObjectPosition(data.heroPhoto),
          filter: 'grayscale(1) contrast(1.25) brightness(0.95)',
        }}
      />
      {/* Duotone tint derived from this shoot's own palette, not an arbitrary brand color */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: data.palette.accent,
          mixBlendMode: 'color',
          opacity: 0.85,
        }}
      />
      {/* Corner scrim guarantees the headline stays readable regardless of what's behind it in this particular photo */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '46%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.88))',
        }}
      />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: barWidth, background: data.palette.accent }} />

      <div style={{ position: 'absolute', left: 44 * s + barWidth, right: 40 * s, bottom: 44 * s, color: '#f4f4f4' }}>
        <div
          style={{
            fontSize: 84 * s,
            fontWeight: 800,
            lineHeight: 0.94,
            letterSpacing: -1.5 * s,
            textTransform: 'uppercase',
            textShadow: '0 2px 18px rgba(0,0,0,0.5)',
          }}
        >
          {data.titleText}
        </div>
        {data.dateText && (
          <div
            style={{
              marginTop: 14 * s,
              fontSize: 16 * s,
              letterSpacing: 4 * s,
              textTransform: 'uppercase',
              opacity: 0.85,
            }}
          >
            {data.dateText}
          </div>
        )}
      </div>
    </div>
  );
}
