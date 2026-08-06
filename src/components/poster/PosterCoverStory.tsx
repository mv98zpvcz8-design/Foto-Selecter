import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';
import { useT } from '../../i18n/useT';

/**
 * One confident full-bleed photo, shown in its real color, under a magazine
 * masthead typographic treatment — top/bottom gradient scrims frame a big
 * tracked-out title and a small mood/people line, no collage elements. The
 * deliberate opposite of PosterCollage/PosterScrapbook: for a shoot where
 * one exceptional frame should carry the whole poster.
 */
export function PosterCoverStory({ data, widthPx, heightPx }: PosterTemplateProps) {
  const t = useT();
  const s = scaleOf(widthPx);

  return (
    <div
      style={{
        position: 'relative',
        width: widthPx,
        height: heightPx,
        overflow: 'hidden',
        background: '#171310',
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
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
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '20%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '18%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 46 * s,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#f6f2e8',
          fontWeight: 800,
          fontSize: 62 * s,
          letterSpacing: 8 * s,
          textTransform: 'uppercase',
          padding: `0 ${20 * s}px`,
        }}
      >
        {data.titleText}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 130 * s,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 64 * s,
          height: 1 * s,
          background: '#f6f2e8',
          opacity: 0.8,
        }}
      />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 46 * s, textAlign: 'center', color: '#f6f2e8' }}>
        <div style={{ fontSize: 15 * s, letterSpacing: 4 * s, textTransform: 'uppercase', fontWeight: 700 }}>
          {t(`poster.mood.${data.mood}`)} &middot; {t(`poster.people.${data.peopleFormat}`)}
        </div>
        {data.dateText && (
          <div style={{ marginTop: 6 * s, fontSize: 11 * s, letterSpacing: 3 * s, textTransform: 'uppercase', opacity: 0.75 }}>
            {data.dateText}
          </div>
        )}
      </div>
    </div>
  );
}
