import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';
import { pickHeroPhoto } from './pickHeroPhoto';
import { useT } from '../../i18n/useT';

/** Magazine-style: photo occupying the top two-thirds, a text block below with a small uppercase kicker, a serif headline, and a byline-style meta line — a fundamentally different reading order (image first, then a distinct text zone) than the overlay-based templates. */
export function PosterEditorial({ data, widthPx, heightPx }: PosterTemplateProps) {
  const t = useT();
  const s = scaleOf(widthPx);
  const hero = pickHeroPhoto(data.galleryPhotos, 'calm');

  return (
    <div
      style={{
        width: widthPx,
        height: heightPx,
        background: '#fbfaf8',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div style={{ position: 'relative', height: heightPx * 0.62, overflow: 'hidden' }}>
        <img
          src={hero.previewUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: smartObjectPosition(hero), display: 'block' }}
        />
      </div>
      <div style={{ flex: 1, padding: `${44 * s}px ${52 * s}px`, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: 14 * s,
            letterSpacing: 3 * s,
            textTransform: 'uppercase',
            color: data.palette.accent,
            fontWeight: 700,
          }}
        >
          {t(`poster.mood.${data.mood}`)} · {t(`poster.people.${data.peopleFormat}`)}
        </div>
        <div style={{ width: 44 * s, height: 2 * s, background: data.palette.accent, margin: `${14 * s}px 0` }} />
        <div
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 56 * s,
            lineHeight: 1.05,
            color: '#1a1a1a',
          }}
        >
          {data.titleText}
        </div>
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 20 * s,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 14 * s,
            color: '#8a8a8a',
            borderTop: `${1 * s}px solid #e5e2dc`,
          }}
        >
          <span>{data.dateText ?? ''}</span>
          <span>{data.photoCountText}</span>
        </div>
      </div>
    </div>
  );
}
