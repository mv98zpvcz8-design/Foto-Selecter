import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { DuotoneImage } from './DuotoneImage';
import { pickHeroPhoto } from './pickHeroPhoto';
import { adjustSaturation, hexToRgb, mixRgb, toHex } from '../../lib/colorPalette';
import { useT } from '../../i18n/useT';

/**
 * Full-bleed duotone hero, a two-zone typographic layout (small info plate
 * up top, heavy headline anchored to a bottom scrim), and a rotated
 * color-chip accent — the sports-editorial "archive remix" look from the
 * references (dramatic duotone crop, negative-space type), built from this
 * shoot's own palette rather than a fixed brand color.
 */
export function PosterBold({ data, widthPx, heightPx }: PosterTemplateProps) {
  const t = useT();
  const s = scaleOf(widthPx);
  const hero = pickHeroPhoto(data.galleryPhotos, 'expressive');
  // Derived from the hero photo's own average color, not the whole gallery's —
  // averaging several differently-lit photos together tends to cancel hue out
  // into gray, which would make the duotone weak precisely when it's most
  // visible (a single dominant photo). Saturation is boosted since a raw
  // photo average is usually too muddy to read as a deliberate color choice.
  const heroRgb = hero.colorStats
    ? { r: hero.colorStats.avgR, g: hero.colorStats.avgG, b: hero.colorStats.avgB }
    : hexToRgb(data.palette.accent);
  const punchy = adjustSaturation(heroRgb, 1.7);
  const shadowColor = toHex(mixRgb(punchy, { r: 6, g: 6, b: 10 }, 0.82));
  const highlightColor = toHex(mixRgb(punchy, { r: 255, g: 255, b: 255 }, 0.32));
  const barWidth = 14 * s;

  return (
    <div
      style={{
        position: 'relative',
        width: widthPx,
        height: heightPx,
        overflow: 'hidden',
        background: shadowColor,
        fontFamily: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <DuotoneImage photo={hero} shadowColor={shadowColor} highlightColor={highlightColor} maxDim={Math.round(widthPx * 1.3)} />

      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: barWidth, background: toHex(punchy), zIndex: 3 }} />

      {/* Info plate in the top corner — a second, smaller typographic zone instead of one big centered block */}
      <div
        style={{
          position: 'absolute',
          left: 32 * s + barWidth,
          top: 32 * s,
          zIndex: 3,
          padding: `${8 * s}px ${14 * s}px`,
          background: `${shadowColor}cc`,
        }}
      >
        <div style={{ fontSize: 13 * s, letterSpacing: 3 * s, textTransform: 'uppercase', color: highlightColor, fontWeight: 700 }}>
          {t(`poster.mood.${data.mood}`)} · {t(`poster.people.${data.peopleFormat}`)}
        </div>
      </div>

      {/* Rotated color-chip accent, standing in for the swatch-card graphic idea from the references */}
      <div
        style={{
          position: 'absolute',
          right: 30 * s,
          top: 30 * s,
          zIndex: 3,
          transform: 'rotate(-6deg)',
          display: 'flex',
          boxShadow: `0 ${4 * s}px ${16 * s}px rgba(0,0,0,0.35)`,
        }}
      >
        {[toHex(punchy), highlightColor, shadowColor].map((c, i) => (
          <div key={i} style={{ width: 20 * s, height: 44 * s, background: c }} />
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '50%',
          background: `linear-gradient(to bottom, transparent, ${shadowColor}e6)`,
          zIndex: 2,
        }}
      />

      <div style={{ position: 'absolute', left: 32 * s + barWidth, right: 36 * s, bottom: 40 * s, zIndex: 3, color: highlightColor }}>
        <div style={{ width: 64 * s, height: 4 * s, background: toHex(punchy), marginBottom: 16 * s }} />
        <div
          style={{
            fontSize: 80 * s,
            fontWeight: 800,
            lineHeight: 0.92,
            letterSpacing: -1.5 * s,
            textTransform: 'uppercase',
          }}
        >
          {data.titleText}
        </div>
        {data.dateText && (
          <div style={{ marginTop: 14 * s, fontSize: 15 * s, letterSpacing: 4 * s, textTransform: 'uppercase', opacity: 0.8 }}>
            {data.dateText}
          </div>
        )}
      </div>
    </div>
  );
}
